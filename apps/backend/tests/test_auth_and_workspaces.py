import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember

@pytest.fixture
async def client():
    # Use httpx AsyncClient to hit the FastAPI app routes directly in-process
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

def get_random_email():
    return f"user_{secrets.token_hex(4)}@example.com"

@pytest.mark.asyncio
async def test_register_login_logout(client: AsyncClient, db_session: AsyncSession):
    email = get_random_email()
    password = "testpassword123"
    db = db_session

    # 1. Register a new user
    register_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password}
    )
    assert register_res.status_code == 201
    reg_data = register_res.json()
    assert "access_token" in reg_data
    assert reg_data["token_type"] == "bearer"

    token = reg_data["access_token"]

    # Verify that user and their default workspace were created in DB
    user_res = await db.execute(select(User).filter(User.email == email))
    user = user_res.scalars().first()
    assert user is not None

    # Check default workspace membership
    member_res = await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user.id))
    member = member_res.scalars().first()
    assert member is not None
    assert member.role == "owner"

    workspace_res = await db.execute(select(Workspace).filter(Workspace.id == member.workspace_id))
    workspace = workspace_res.scalars().first()
    assert workspace is not None
    assert workspace.name == f"{email.split('@')[0]}'s Workspace"

    workspace_id = workspace.id

    # 2. Try registering same email (should fail)
    duplicate_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password}
    )
    assert duplicate_res.status_code == 400

    # 3. Login with form-data
    login_res = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    
    # 4. Access protected route without token (should fail)
    stub_res = await client.get("/api/v1/workflows")
    assert stub_res.status_code == 401

    # 5. Access protected route with token (should succeed)
    headers = {"Authorization": f"Bearer {token}"}
    stub_res = await client.get("/api/v1/workflows", headers=headers)
    assert stub_res.status_code == 200
    stub_data = stub_res.json()
    assert isinstance(stub_data, list)

    # 6. Logout
    logout_res = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # 7. Try accessing protected route again with blacklisted token (should fail)
    stub_res_after = await client.get("/api/v1/workflows", headers=headers)
    assert stub_res_after.status_code == 401

    # Clean up DB records created by this test
    # Delete workspace (cascade deletes members)
    await db.delete(workspace)
    await db.delete(user)
    await db.commit()

@pytest.mark.asyncio
async def test_workspace_isolation(client: AsyncClient, db_session: AsyncSession):
    email_a = get_random_email()
    password_a = "passA123"
    db = db_session

    # Register User A
    reg_a = await client.post(
        "/api/v1/auth/register",
        json={"email": email_a, "password": password_a}
    )
    token_a = reg_a.json()["access_token"]

    # Register User B
    email_b = get_random_email()
    password_b = "passB123"
    reg_b = await client.post(
        "/api/v1/auth/register",
        json={"email": email_b, "password": password_b}
    )
    token_b = reg_b.json()["access_token"]

    # Find their workspace IDs
    user_a = (await db.execute(select(User).filter(User.email == email_a))).scalars().first()
    member_a = (await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user_a.id))).scalars().first()
    workspace_id_a = member_a.workspace_id

    user_b = (await db.execute(select(User).filter(User.email == email_b))).scalars().first()
    member_b = (await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user_b.id))).scalars().first()
    workspace_id_b = member_b.workspace_id

    # User A requests their own workspace (implicitly via default fallback)
    res_a_implicit = await client.get(
        "/api/v1/workflows",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_a_implicit.status_code == 200
    assert isinstance(res_a_implicit.json(), list)

    # User A requests their own workspace explicitly via header
    res_a_explicit = await client.get(
        "/api/v1/workflows",
        headers={
            "Authorization": f"Bearer {token_a}",
            "X-Workspace-ID": workspace_id_a
        }
    )
    assert res_a_explicit.status_code == 200
    assert isinstance(res_a_explicit.json(), list)

    # User A requests User B's workspace explicitly (should fail with 403 Forbidden)
    res_a_cross = await client.get(
        "/api/v1/workflows",
        headers={
            "Authorization": f"Bearer {token_a}",
            "X-Workspace-ID": workspace_id_b
        }
    )
    assert res_a_cross.status_code == 403

    # Clean up DB records
    w_a = (await db.execute(select(Workspace).filter(Workspace.id == workspace_id_a))).scalars().first()
    w_b = (await db.execute(select(Workspace).filter(Workspace.id == workspace_id_b))).scalars().first()
    await db.delete(w_a)
    await db.delete(w_b)
    await db.delete(user_a)
    await db.delete(user_b)
    await db.commit()

@pytest.mark.asyncio
async def test_user_profile_get_and_update(client: AsyncClient, db_session: AsyncSession):
    email = get_random_email()
    password = "initialpassword123"
    db = db_session

    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Original Name"}
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /api/v1/auth/me
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == email
    assert me_data["full_name"] == "Original Name"

    # 2. PATCH /api/v1/auth/me (Update full_name)
    update_res = await client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"full_name": "Updated Profile Name"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Updated Profile Name"

    # 3. Change password with wrong current password (should fail)
    bad_pass_res = await client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"current_password": "wrongpassword", "new_password": "newpassword123"}
    )
    assert bad_pass_res.status_code == 400

    # 4. Change password with correct current password
    good_pass_res = await client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"current_password": password, "new_password": "newpassword123"}
    )
    assert good_pass_res.status_code == 200

    # 5. Login with new password
    login_new = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "newpassword123"}
    )
    assert login_new.status_code == 200

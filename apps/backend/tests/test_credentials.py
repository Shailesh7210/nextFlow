import pytest
import json
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.credential import Credential
from app.core.crypto import decrypt_data

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

def get_random_email():
    return f"user_{secrets.token_hex(4)}@example.com"

@pytest.mark.asyncio
async def test_credentials_crud_and_encryption(client: AsyncClient, db_session: AsyncSession):
    email = get_random_email()
    password = "pass123password"
    db = db_session

    # 1. Register & Auth
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password}
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve workspace ID and User
    user = (await db.execute(select(User).filter(User.email == email))).scalars().first()
    member = (await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user.id))).scalars().first()
    workspace_id = member.workspace_id

    # 2. Create Credential (POST /api/v1/credentials)
    cred_name = "GitLab API Key"
    cred_type = "api-key"
    cred_data = {"api_key": "glpat-secret-token-12345", "url": "https://gitlab.com"}
    
    create_res = await client.post(
        "/api/v1/credentials",
        json={
            "name": cred_name,
            "type": cred_type,
            "data": cred_data
        },
        headers=headers
    )
    assert create_res.status_code == 201
    res_body = create_res.json()
    assert res_body["name"] == cred_name
    assert res_body["type"] == cred_type
    # Assert values are masked for frontend display
    assert res_body["data"]["api_key"] == "********"
    assert res_body["data"]["url"] == "https://gitlab.com" # non-sensitive stays readable
    cred_id = res_body["id"]

    # 3. Direct DB Check (Check encryption at rest!)
    db_cred = (await db.execute(select(Credential).filter(Credential.id == cred_id))).scalars().first()
    assert db_cred is not None
    # Data is encrypted and not in plaintext in the table
    assert "glpat-secret-token-12345" not in db_cred.encrypted_data
    # Can decrypt and read original payload
    decrypted_str = decrypt_data(db_cred.encrypted_data)
    decrypted_dict = json.loads(decrypted_str)
    assert decrypted_dict["api_key"] == "glpat-secret-token-12345"
    assert decrypted_dict["url"] == "https://gitlab.com"

    # 4. Get Credential (GET /api/v1/credentials/{id})
    get_res = await client.get(f"/api/v1/credentials/{cred_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["api_key"] == "********"

    # 5. Update Credential (PUT /api/v1/credentials/{id})
    update_res = await client.put(
        f"/api/v1/credentials/{cred_id}",
        json={
            "name": "GitLab API Key Updated",
            "data": {"api_key": "glpat-new-token-99999"}
        },
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "GitLab API Key Updated"
    assert update_res.json()["data"]["api_key"] == "********"

    # Re-verify DB contains new token encrypted
    db.expunge_all()
    db_cred = (await db.execute(select(Credential).filter(Credential.id == cred_id))).scalars().first()
    decrypted_str = decrypt_data(db_cred.encrypted_data)
    decrypted_dict = json.loads(decrypted_str)
    assert decrypted_dict["api_key"] == "glpat-new-token-99999"
    # url was merged and persisted
    assert decrypted_dict["url"] == "https://gitlab.com"

    # 6. List Credentials (GET /api/v1/credentials)
    list_res = await client.get("/api/v1/credentials", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == cred_id

    # 7. Delete Credential (DELETE /api/v1/credentials/{id})
    delete_res = await client.delete(f"/api/v1/credentials/{cred_id}", headers=headers)
    assert delete_res.status_code == 200
    
    # Verify deletion
    db.expunge_all()
    db_cred_deleted = (await db.execute(select(Credential).filter(Credential.id == cred_id))).scalars().first()
    assert db_cred_deleted is None

    # Cleanup Workspace & User
    w = (await db.execute(select(Workspace).filter(Workspace.id == workspace_id))).scalars().first()
    await db.delete(w)
    await db.delete(user)
    await db.commit()

@pytest.mark.asyncio
async def test_credentials_rbac_permissions(client: AsyncClient, db_session: AsyncSession):
    db = db_session

    # 1. Register Owner (User A)
    email_a = get_random_email()
    reg_a = await client.post(
        "/api/v1/auth/register",
        json={"email": email_a, "password": "password123"}
    )
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Retrieve workspace ID and Owner User
    user_a = (await db.execute(select(User).filter(User.email == email_a))).scalars().first()
    member_a = (await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user_a.id))).scalars().first()
    workspace_id = member_a.workspace_id

    # 2. Register Viewer (User B)
    email_b = get_random_email()
    reg_b = await client.post(
        "/api/v1/auth/register",
        json={"email": email_b, "password": "password123"}
    )
    token_b = reg_b.json()["access_token"]
    headers_b = {
        "Authorization": f"Bearer {token_b}",
        "X-Workspace-ID": workspace_id
    }
    user_b = (await db.execute(select(User).filter(User.email == email_b))).scalars().first()

    # Add User B to User A's workspace as a Viewer
    member_b = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user_b.id,
        role="viewer"
    )
    db.add(member_b)
    await db.commit()

    # 3. Viewer attempts to create credential (should fail with 403)
    viewer_create_res = await client.post(
        "/api/v1/credentials",
        json={"name": "Viewer Key", "type": "api-key", "data": {"token": "x"}},
        headers=headers_b
    )
    assert viewer_create_res.status_code == 403

    # 4. Owner creates credential
    owner_create_res = await client.post(
        "/api/v1/credentials",
        json={"name": "Owner Key", "type": "api-key", "data": {"token": "x"}},
        headers=headers_a
    )
    assert owner_create_res.status_code == 201
    cred_id = owner_create_res.json()["id"]

    # 5. Viewer attempts to delete credential (should fail with 403)
    viewer_delete_res = await client.delete(f"/api/v1/credentials/{cred_id}", headers=headers_b)
    assert viewer_delete_res.status_code == 403

    # 6. Upgrade Viewer B to Editor
    member_b.role = "editor"
    await db.commit()

    # Editor attempts to update credential (should succeed)
    editor_update_res = await client.put(
        f"/api/v1/credentials/{cred_id}",
        json={"name": "Editor Updated Key"},
        headers=headers_b
    )
    assert editor_update_res.status_code == 200

    # Editor attempts to delete credential (should fail - only owner/admin can delete)
    editor_delete_res = await client.delete(f"/api/v1/credentials/{cred_id}", headers=headers_b)
    assert editor_delete_res.status_code == 403

    # Cleanup
    w = (await db.execute(select(Workspace).filter(Workspace.id == workspace_id))).scalars().first()
    await db.delete(w)
    await db.delete(user_a)
    await db.delete(user_b)
    await db.commit()

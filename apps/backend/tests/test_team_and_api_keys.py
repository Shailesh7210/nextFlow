import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.api_key import ApiKey
from app.core.security import create_access_token, get_password_hash

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_team_members_and_api_keys_flow(client: AsyncClient, db_session):
    # 1. Create owner user and active workspace
    owner_email = f"owner_{secrets.token_hex(4)}@example.com"
    owner = User(
        email=owner_email,
        hashed_password=get_password_hash("password123"),
        full_name="Workspace Owner",
        is_active=True
    )
    db_session.add(owner)
    await db_session.commit()
    await db_session.refresh(owner)

    workspace = Workspace(name="Enterprise Test Workspace")
    db_session.add(workspace)
    await db_session.commit()
    await db_session.refresh(workspace)

    member = WorkspaceMember(workspace_id=workspace.id, user_id=owner.id, role="owner")
    db_session.add(member)
    await db_session.commit()

    token = create_access_token(owner.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Workspace-ID": workspace.id
    }

    # 2. Test GET /api/v1/workspaces/members
    mem_resp = await client.get("/api/v1/workspaces/members", headers=headers)
    assert mem_resp.status_code == 200
    members = mem_resp.json()
    assert len(members) == 1
    assert members[0]["email"] == owner_email
    assert members[0]["role"] == "owner"

    # 3. Test POST /api/v1/workspaces/members/invite
    invite_email = f"developer_{secrets.token_hex(4)}@example.com"
    invite_resp = await client.post(
        "/api/v1/workspaces/members/invite",
        headers=headers,
        json={"email": invite_email, "role": "editor"}
    )
    assert invite_resp.status_code == 201
    invited_data = invite_resp.json()
    assert invited_data["email"] == invite_email
    assert invited_data["role"] == "editor"

    # Re-fetch members
    mem_resp_2 = await client.get("/api/v1/workspaces/members", headers=headers)
    assert mem_resp_2.status_code == 200
    assert len(mem_resp_2.json()) == 2

    # 4. Test PATCH /api/v1/workspaces/members/{member_id}
    invited_id = invited_data["id"]
    patch_resp = await client.patch(
        f"/api/v1/workspaces/members/{invited_id}",
        headers=headers,
        json={"role": "admin"}
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["role"] == "admin"

    # 5. Test API Keys Generation
    create_key_resp = await client.post(
        "/api/v1/api-keys",
        headers=headers,
        json={"name": "Production CLI Key"}
    )
    assert create_key_resp.status_code == 201
    key_data = create_key_resp.json()
    assert key_data["name"] == "Production CLI Key"
    assert key_data["api_key"].startswith("nex_live_")
    key_id = key_data["id"]

    # List API keys (should hide secret plaintext key)
    list_keys_resp = await client.get("/api/v1/api-keys", headers=headers)
    assert list_keys_resp.status_code == 200
    keys = list_keys_resp.json()
    assert len(keys) == 1
    assert keys[0]["id"] == key_id
    assert "api_key" not in keys[0]

    # 6. Test Revoke API Key
    del_key_resp = await client.delete(f"/api/v1/api-keys/{key_id}", headers=headers)
    assert del_key_resp.status_code == 200

    # Verify key list is now empty
    list_keys_resp_2 = await client.get("/api/v1/api-keys", headers=headers)
    assert list_keys_resp_2.status_code == 200
    assert len(list_keys_resp_2.json()) == 0

    # 7. Test Remove Workspace Member
    del_mem_resp = await client.delete(f"/api/v1/workspaces/members/{invited_id}", headers=headers)
    assert del_mem_resp.status_code == 200

    mem_resp_3 = await client.get("/api/v1/workspaces/members", headers=headers)
    assert len(mem_resp_3.json()) == 1

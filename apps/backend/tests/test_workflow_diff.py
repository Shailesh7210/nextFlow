import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.core.security import create_access_token, get_password_hash

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_workflow_version_diff(client: AsyncClient, db_session):
    # Setup test user & workspace
    email = f"user_{secrets.token_hex(4)}@example.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        full_name="Diff Tester",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    workspace = Workspace(name="Diff Workspace")
    db_session.add(workspace)
    await db_session.commit()
    await db_session.refresh(workspace)

    member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
    db_session.add(member)
    await db_session.commit()

    token = create_access_token(user.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Workspace-ID": workspace.id
    }

    # 1. Create v1 workflow with 2 nodes
    create_resp = await client.post(
        "/api/v1/workflows",
        headers=headers,
        json={
            "name": "Diff Workflow Test",
            "nodes": [
                {"id": "node_1", "type": "webhook", "position": {"x": 0, "y": 0}, "name": "Trigger", "config": {}},
                {"id": "node_2", "type": "set", "position": {"x": 100, "y": 0}, "name": "Set V1", "config": {"variable": "v", "value": "1"}}
            ],
            "connections": [
                {"source": "node_1", "sourcePort": "output", "target": "node_2", "targetPort": "input"}
            ]
        }
    )
    assert create_resp.status_code == 201
    wf_id = create_resp.json()["id"]

    # Publish v1
    pub1_resp = await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    assert pub1_resp.status_code == 201
    v1_id = pub1_resp.json()["id"]

    # 2. Modify workflow: add node_3, modify node_2 config, remove node_1 connection
    save_resp = await client.put(
        f"/api/v1/workflows/{wf_id}",
        headers=headers,
        json={
            "name": "Diff Workflow Test v2",
            "nodes": [
                {"id": "node_1", "type": "webhook", "position": {"x": 0, "y": 0}, "name": "Trigger", "config": {}},
                {"id": "node_2", "type": "set", "position": {"x": 100, "y": 0}, "name": "Set V2", "config": {"variable": "v", "value": "2"}},
                {"id": "node_3", "type": "delay", "position": {"x": 200, "y": 0}, "name": "Delay 5s", "config": {"duration": 5}}
            ],
            "connections": [
                {"source": "node_1", "sourcePort": "output", "target": "node_2", "targetPort": "input"},
                {"source": "node_2", "sourcePort": "output", "target": "node_3", "targetPort": "input"}
            ]
        }
    )
    assert save_resp.status_code == 200

    # Publish v2
    pub2_resp = await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    assert pub2_resp.status_code == 201
    v2_id = pub2_resp.json()["id"]

    # 3. Call version diff API
    diff_resp = await client.get(
        f"/api/v1/workflows/{wf_id}/versions/diff?v1={v1_id}&v2={v2_id}",
        headers=headers
    )
    assert diff_resp.status_code == 200
    diff_data = diff_resp.json()

    # Assert diff calculation results
    summary = diff_data["summary"]
    assert summary["added_count"] == 1  # node_3 added
    assert summary["deleted_count"] == 0
    assert summary["modified_count"] == 1  # node_2 modified (value 1 -> 2)
    assert summary["added_connections_count"] == 1  # node_2 -> node_3 connection added

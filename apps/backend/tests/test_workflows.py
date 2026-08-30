import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workflow import Workflow
from app.models.workflow_version import WorkflowVersion

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

def get_random_email():
    return f"user_{secrets.token_hex(4)}@example.com"

@pytest.mark.asyncio
async def test_workflow_crud_and_duplication(client: AsyncClient, db_session: AsyncSession):
    email = get_random_email()
    password = "pass123password"
    db = db_session

    # 1. Register & authenticate
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password}
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch user's default workspace
    user = (await db.execute(select(User).filter(User.email == email))).scalars().first()
    member = (await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user.id))).scalars().first()
    workspace_id = member.workspace_id

    # 2. Create Workflow Draft
    wf_name = "Lead Ingest Workflow"
    wf_nodes = [{"id": "trig_1", "type": "webhook"}]
    wf_conns = []
    create_res = await client.post(
        "/api/v1/workflows",
        json={
            "name": wf_name,
            "description": "Ingests incoming leads",
            "nodes": wf_nodes,
            "connections": wf_conns
        },
        headers=headers
    )
    assert create_res.status_code == 201
    wf_data = create_res.json()
    assert wf_data["name"] == wf_name
    assert wf_data["nodes"] == wf_nodes
    assert wf_data["is_active"] is False
    wf_id = wf_data["id"]

    # 3. List Workflows
    list_res = await client.get("/api/v1/workflows", headers=headers)
    assert list_res.status_code == 200
    workflows = list_res.json()
    assert len(workflows) == 1
    assert workflows[0]["id"] == wf_id

    # 4. Get Workflow detail
    get_res = await client.get(f"/api/v1/workflows/{wf_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == wf_name

    # 5. Update Workflow Draft
    updated_nodes = [
        {"id": "trig_1", "type": "webhook"},
        {"id": "http_1", "type": "http-request"}
    ]
    update_res = await client.put(
        f"/api/v1/workflows/{wf_id}",
        json={"nodes": updated_nodes, "description": "Updated description"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["nodes"] == updated_nodes
    assert update_res.json()["description"] == "Updated description"

    # 6. Duplicate Workflow
    dup_res = await client.post(
        f"/api/v1/workflows/{wf_id}/duplicate",
        headers=headers
    )
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["name"] == f"{wf_name} - Copy"
    assert dup_data["nodes"] == updated_nodes
    assert dup_data["id"] != wf_id
    dup_id = dup_data["id"]

    # 7. Delete Duplicated Workflow
    delete_res = await client.delete(f"/api/v1/workflows/{dup_id}", headers=headers)
    assert delete_res.status_code == 200

    # Verify duplicated workflow is gone
    get_dup_res = await client.get(f"/api/v1/workflows/{dup_id}", headers=headers)
    assert get_dup_res.status_code == 404

    # Cleanup parent records
    w = (await db.execute(select(Workspace).filter(Workspace.id == workspace_id))).scalars().first()
    await db.delete(w)
    await db.delete(user)
    await db.commit()

@pytest.mark.asyncio
async def test_workflow_versioning_and_activation(client: AsyncClient, db_session: AsyncSession):
    email = get_random_email()
    password = "pass123password"
    db = db_session

    # Register & Auth
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password}
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch user's default workspace
    user = (await db.execute(select(User).filter(User.email == email))).scalars().first()
    member = (await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user.id))).scalars().first()
    workspace_id = member.workspace_id

    # Create a workflow
    create_res = await client.post(
        "/api/v1/workflows",
        json={"name": "Trigger Workflow"},
        headers=headers
    )
    wf_id = create_res.json()["id"]

    # 1. Try to activate without publishing (should fail with 400 Bad Request)
    act_fail_res = await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=headers)
    assert act_fail_res.status_code == 400

    # 2. Publish Version 1
    pub_res_1 = await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    assert pub_res_1.status_code == 201
    pub_data_1 = pub_res_1.json()
    assert pub_data_1["version"] == 1
    assert pub_data_1["workflow_id"] == wf_id
    version_id_1 = pub_data_1["id"]

    # Verify active version ID is pointing to Version 1
    wf_res_1 = await client.get(f"/api/v1/workflows/{wf_id}", headers=headers)
    assert wf_res_1.json()["active_version_id"] == version_id_1

    # 3. Update Draft and Publish Version 2
    await client.put(
        f"/api/v1/workflows/{wf_id}",
        json={"nodes": [{"id": "trig_1", "type": "schedule"}]},
        headers=headers
    )
    pub_res_2 = await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    assert pub_res_2.status_code == 201
    pub_data_2 = pub_res_2.json()
    assert pub_data_2["version"] == 2
    assert pub_data_2["nodes"] == [{"id": "trig_1", "type": "schedule"}]
    version_id_2 = pub_data_2["id"]

    # Verify active version ID is now pointing to Version 2
    wf_res_2 = await client.get(f"/api/v1/workflows/{wf_id}", headers=headers)
    assert wf_res_2.json()["active_version_id"] == version_id_2

    # 4. List versions
    history_res = await client.get(f"/api/v1/workflows/{wf_id}/versions", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 2
    assert history[0]["version"] == 2  # Ordered descending
    assert history[1]["version"] == 1

    # 5. Activate workflow
    act_res = await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=headers)
    assert act_res.status_code == 200
    assert act_res.json()["is_active"] is True

    # 6. Deactivate workflow
    deact_res = await client.post(f"/api/v1/workflows/{wf_id}/deactivate", headers=headers)
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Cleanup DB records
    w = (await db.execute(select(Workspace).filter(Workspace.id == workspace_id))).scalars().first()
    await db.delete(w)
    await db.delete(user)
    await db.commit()

@pytest.mark.asyncio
async def test_workflows_rbac_permissions(client: AsyncClient, db_session: AsyncSession):
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
        "X-Workspace-ID": workspace_id # Request User A's workspace
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

    # 3. Owner creates a workflow
    create_wf_res = await client.post(
        "/api/v1/workflows",
        json={"name": "Owner Flow"},
        headers=headers_a
    )
    assert create_wf_res.status_code == 201
    wf_id = create_wf_res.json()["id"]

    # 4. Viewer tries to list workflows in User A's workspace (should succeed)
    viewer_list_res = await client.get("/api/v1/workflows", headers=headers_b)
    assert viewer_list_res.status_code == 200
    assert len(viewer_list_res.json()) == 1

    # 5. Viewer tries to create a workflow in User A's workspace (should fail with 403 Forbidden)
    viewer_create_res = await client.post(
        "/api/v1/workflows",
        json={"name": "Viewer Try"},
        headers=headers_b
    )
    assert viewer_create_res.status_code == 403

    # 6. Viewer tries to update Owner's workflow (should fail with 403 Forbidden)
    viewer_update_res = await client.put(
        f"/api/v1/workflows/{wf_id}",
        json={"name": "Viewer Hack"},
        headers=headers_b
    )
    assert viewer_update_res.status_code == 403

    # 7. Viewer tries to publish Owner's workflow (should fail with 403 Forbidden)
    viewer_pub_res = await client.post(
        f"/api/v1/workflows/{wf_id}/publish",
        headers=headers_b
    )
    assert viewer_pub_res.status_code == 403

    # 8. Upgrade User B to Editor and re-test
    member_b.role = "editor"
    await db.commit()

    # Editor tries to update Owner's workflow (should succeed)
    editor_update_res = await client.put(
        f"/api/v1/workflows/{wf_id}",
        json={"name": "Editor Update"},
        headers=headers_b
    )
    assert editor_update_res.status_code == 200
    assert editor_update_res.json()["name"] == "Editor Update"

    # Editor tries to delete Owner's workflow (should fail - only owners/admins can delete)
    editor_delete_res = await client.delete(
        f"/api/v1/workflows/{wf_id}",
        headers=headers_b
    )
    assert editor_delete_res.status_code == 403

    # Cleanup DB records
    w = (await db.execute(select(Workspace).filter(Workspace.id == workspace_id))).scalars().first()
    u_a = (await db.execute(select(User).filter(User.id == user_a.id))).scalars().first()
    u_b = (await db.execute(select(User).filter(User.id == user_b.id))).scalars().first()
    
    await db.delete(w)
    await db.delete(u_a)
    await db.delete(u_b)
    await db.commit()

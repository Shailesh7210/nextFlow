import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.approval_request import ApprovalRequest
from app.models.execution_log import ExecutionLog
from app.core.executor import WorkflowExecutor
from app.core.security import create_access_token, get_password_hash

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_human_approval_pause_and_resume(client: AsyncClient, db_session):
    # Setup test user and workspace
    email = f"user_{secrets.token_hex(4)}@example.com"
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        full_name="Approval Tester",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    workspace = Workspace(name="Approval Workspace")
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

    # 1. Create a workflow with Human Approval node & 2 branch nodes
    create_resp = await client.post(
        "/api/v1/workflows",
        headers=headers,
        json={
            "name": "Approval Workflow",
            "description": "Tests human-approval node pause and resume",
            "nodes": [
                {
                    "id": "trigger_1",
                    "type": "webhook",
                    "position": {"x": 100, "y": 100},
                    "name": "Webhook Trigger",
                    "config": {}
                },
                {
                    "id": "approval_node",
                    "type": "human-approval",
                    "position": {"x": 300, "y": 100},
                    "name": "Manager Approval",
                    "config": {
                        "approver_email": "manager@company.com",
                        "message": "Approve budget request"
                    }
                },
                {
                    "id": "approved_set",
                    "type": "set",
                    "position": {"x": 500, "y": 50},
                    "name": "Set Approved Flag",
                    "config": {"variable": "approved_flag", "value": True}
                },
                {
                    "id": "rejected_set",
                    "type": "set",
                    "position": {"x": 500, "y": 200},
                    "name": "Set Rejected Flag",
                    "config": {"variable": "rejected_flag", "value": True}
                }
            ],
            "connections": [
                {"source": "trigger_1", "sourcePort": "output", "target": "approval_node", "targetPort": "input"},
                {"source": "approval_node", "sourcePort": "approved", "target": "approved_set", "targetPort": "input"},
                {"source": "approval_node", "sourcePort": "rejected", "target": "rejected_set", "targetPort": "input"}
            ]
        }
    )
    assert create_resp.status_code == 201
    wf_id = create_resp.json()["id"]

    # Publish version
    pub_resp = await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    assert pub_resp.status_code == 201
    version_id = pub_resp.json()["id"]

    # Create ExecutionLog entry
    exec_log = ExecutionLog(
        workflow_id=wf_id,
        version_id=version_id,
        status="QUEUED",
        trigger_type="MANUAL",
        input_data={"amount": 5000},
        output_data={},
        node_executions=[]
    )
    db_session.add(exec_log)
    await db_session.commit()
    await db_session.refresh(exec_log)

    # 2. Execute workflow engine
    executor = WorkflowExecutor(db_session)
    await executor.execute_workflow(exec_log.id)

    # Re-query execution log to check PAUSED status
    await db_session.refresh(exec_log)
    assert exec_log.status == "PAUSED"

    # 3. Check pending approvals endpoint
    pending_resp = await client.get("/api/v1/approvals/pending", headers=headers)
    assert pending_resp.status_code == 200
    pending_items = pending_resp.json()
    assert len(pending_items) == 1
    approval_token = pending_items[0]["token"]
    assert pending_items[0]["approver_email"] == "manager@company.com"

    # 4. Respond with APPROVE decision
    respond_resp = await client.post(
        f"/api/v1/approvals/{approval_token}/respond",
        headers=headers,
        json={"action": "approve", "decider_email": "vp@company.com"}
    )
    assert respond_resp.status_code == 200
    res_data = respond_resp.json()
    assert res_data["status"] == "RESUMED"

    # Verify execution resumed to SUCCESS and followed 'approved' branch
    await db_session.refresh(exec_log)
    assert exec_log.status == "SUCCESS"
    assert exec_log.output_data.get("approved_flag") is True

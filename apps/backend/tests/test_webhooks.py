import pytest
import asyncio
import json
import secrets
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workflow import Workflow
from app.models.execution_log import ExecutionLog
from app.core.celery_app import celery_app

@pytest.fixture
def run_celery_eager():
    old_eager = celery_app.conf.task_always_eager
    celery_app.conf.task_always_eager = True
    yield
    celery_app.conf.task_always_eager = old_eager

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

def get_random_email():
    return f"user_{secrets.token_hex(4)}@example.com"

@pytest.mark.asyncio
async def test_inbound_webhook_trigger(client: AsyncClient, db_session: AsyncSession, run_celery_eager):
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

    # 2. Create Workflow with Webhook -> Set Variable flow
    nodes = [
        {
            "id": "node-wh",
            "type": "webhook",
            "position": {"x": 100, "y": 100},
            "data": {"label": "Inbound Webhook", "config": {}}
        },
        {
            "id": "node-set",
            "type": "set",
            "position": {"x": 300, "y": 100},
            "data": {
                "label": "Capture Query Param",
                "config": {"variable": "source", "value": "{{ $json.query.ref }}"}
            }
        }
    ]

    connections = [
        {"id": "e1", "source": "node-wh", "target": "node-set", "sourceHandle": "output", "targetHandle": "input"}
    ]

    wf_res = await client.post(
        "/api/v1/workflows",
        json={
            "name": "Inbound Webhook Demo",
            "description": "Listen for incoming webhook requests",
            "nodes": nodes,
            "connections": connections
        },
        headers=headers
    )
    assert wf_res.status_code == 201
    wf_id = wf_res.json()["id"]

    # 3. Try to trigger webhook when inactive -> 400 Bad Request
    inactive_res = await client.post(f"/api/v1/webhooks/{wf_id}")
    assert inactive_res.status_code == 400
    assert "not active" in inactive_res.json()["detail"].lower()

    # 4. Publish and Activate Workflow
    pub_res = await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    assert pub_res.status_code == 201

    act_res = await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=headers)
    assert act_res.status_code == 200

    # 5. Send Inbound Webhook POST Request with query parameters & json body
    webhook_payload = {"customer_id": "cust_9988", "action": "checkout"}
    wh_res = await client.post(
        f"/api/v1/webhooks/{wf_id}/v1/checkout_hook?ref=google_ads",
        json=webhook_payload,
        headers={"X-Custom-Header": "NexFlowTest"}
    )
    assert wh_res.status_code == 202
    res_body = wh_res.json()
    assert res_body["status"] == "PENDING"
    exec_id = res_body["id"]

    # Wait for background task to reach terminal state
    exec_log = None
    for _ in range(20):
        await asyncio.sleep(0.1)
        db.expire_all()
        exec_log = (await db.execute(select(ExecutionLog).filter(ExecutionLog.id == exec_id))).scalars().first()
        if exec_log and exec_log.status in ("SUCCESS", "FAILED"):
            break
    await db.refresh(exec_log)
    assert exec_log is not None
    assert exec_log.status == "SUCCESS"
    assert exec_log.trigger_type == "webhook"
    
    # Assert inbound payload details captured accurately
    input_data = exec_log.input_data
    assert input_data["query"]["ref"] == "google_ads"
    assert input_data["body"]["customer_id"] == "cust_9988"
    assert input_data["headers"]["x-custom-header"] == "NexFlowTest"
    assert input_data["subpath"] == "v1/checkout_hook"
    
    # Assert Set Node output resolved query param "google_ads"
    assert exec_log.output_data["source"] == "google_ads"

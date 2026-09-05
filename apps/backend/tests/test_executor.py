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
from app.models.workflow_version import WorkflowVersion
from app.models.execution_log import ExecutionLog
from app.models.credential import Credential
from app.core.celery_app import celery_app

@pytest.fixture
def run_celery_eager():
    """
    Fixture to run Celery tasks synchronously (eager execution) during tests.
    """
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
async def test_workflow_execution_engine(client: AsyncClient, db_session: AsyncSession, run_celery_eager):
    email = get_random_email()
    password = "pass123password"
    db = db_session

    # 1. Register user & set workspace
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password}
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    user = (await db.execute(select(User).filter(User.email == email))).scalars().first()
    member = (await db.execute(select(WorkspaceMember).filter(WorkspaceMember.user_id == user.id))).scalars().first()
    workspace_id = member.workspace_id

    # 2. Create Credential (Basic Auth)
    cred_res = await client.post(
        "/api/v1/credentials",
        json={
            "name": "Service Basic Auth",
            "type": "basic-auth",
            "data": {"username": "api_user", "password": "super_secret_password"}
        },
        headers=headers
    )
    assert cred_res.status_code == 201
    cred_id = cred_res.json()["id"]

    # 3. Create Workflow
    # We construct a graph with 3 nodes: Webhook trigger -> Set variable -> IF condition.
    # Set variable sets "score" to "100"
    # IF condition checks if "score" equals "100"
    nodes = [
        {
            "id": "node-webhook",
            "type": "webhook",
            "position": {"x": 100, "y": 100},
            "data": {"label": "Start Webhook", "config": {}}
        },
        {
            "id": "node-set",
            "type": "set",
            "position": {"x": 300, "y": 100},
            "data": {
                "label": "Set Score",
                "config": {"variable": "score", "value": "100"}
            }
        },
        {
            "id": "node-if",
            "type": "if",
            "position": {"x": 500, "y": 100},
            "data": {
                "label": "Check Score",
                "config": {
                    "value1": "{{ $json.score }}",
                    "condition": "equals",
                    "value2": "100"
                }
            }
        }
    ]

    connections = [
        {"id": "edge-1", "source": "node-webhook", "target": "node-set", "sourceHandle": "output", "targetHandle": "input"},
        {"id": "edge-2", "source": "node-set", "target": "node-if", "sourceHandle": "output", "targetHandle": "input"}
    ]

    wf_res = await client.post(
        "/api/v1/workflows",
        json={
            "name": "Execution Demo Flow",
            "description": "Test workflow engine",
            "nodes": nodes,
            "connections": connections
        },
        headers=headers
    )
    assert wf_res.status_code == 201
    wf_id = wf_res.json()["id"]

    # 4. Publish version to make it active and executable
    pub_res = await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    assert pub_res.status_code == 201

    # Activate workflow
    act_res = await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=headers)
    assert act_res.status_code == 200

    # 5. Trigger execution (POST /api/v1/workflows/{id}/execute)
    exec_input = {"event": "signup", "user_id": 42}
    exec_res = await client.post(
        f"/api/v1/workflows/{wf_id}/execute",
        json=exec_input,
        headers=headers
    )
    assert exec_res.status_code == 201
    exec_body = exec_res.json()
    assert exec_body["status"] == "PENDING"
    exec_id = exec_body["id"]

    # Wait for background task to reach terminal state
    exec_log = None
    for _ in range(20):
        await asyncio.sleep(0.1)
        db.expire_all()
        exec_log = (await db.execute(select(ExecutionLog).filter(ExecutionLog.id == exec_id))).scalars().first()
        if exec_log and exec_log.status in ("SUCCESS", "FAILED"):
            break
    await db.refresh(exec_log)
    
    # Assert execution completed successfully in eager execution mode
    assert exec_log is not None
    assert exec_log.status == "SUCCESS"
    assert exec_log.trigger_type == "manual"
    assert exec_log.input_data == exec_input
    
    # Assert result propagates correctly (final output is the output of last node "IF" -> branch true)
    assert exec_log.output_data["result"] is True
    assert exec_log.output_data["branch"] == "true"
    
    # Assert node_executions list tracks execution traces for all nodes
    assert len(exec_log.node_executions) == 3
    assert exec_log.node_executions[0]["node_id"] == "node-webhook"
    assert exec_log.node_executions[0]["status"] == "SUCCESS"
    assert exec_log.node_executions[1]["node_id"] == "node-set"
    # Verify input context resolved for Set node
    assert exec_log.node_executions[1]["inputs"]["$json"]["event"] == "signup"
    # Verify outputs of Set node
    assert exec_log.node_executions[1]["outputs"]["score"] == "100"
    
    # Assert we can list executions (GET /api/v1/workflows/{id}/executions)
    list_res = await client.get(f"/api/v1/workflows/{wf_id}/executions", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == exec_id


@pytest.mark.asyncio
async def test_sub_workflow_execution(client: AsyncClient, db_session: AsyncSession, run_celery_eager):
    email = get_random_email()
    password = "pass123password"
    db = db_session

    reg_res = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # 1. Create Child Sub-Workflow
    child_nodes = [
        {"id": "child-wh", "type": "webhook", "position": {"x": 0, "y": 0}, "data": {}},
        {"id": "child-set", "type": "set", "position": {"x": 200, "y": 0}, "data": {"config": {"variable": "child_processed", "value": "true"}}}
    ]
    child_conns = [{"id": "c1", "source": "child-wh", "target": "child-set"}]
    
    child_wf_res = await client.post("/api/v1/workflows", json={"name": "Child Sub-Workflow", "nodes": child_nodes, "connections": child_conns}, headers=headers)
    assert child_wf_res.status_code == 201
    child_wf_id = child_wf_res.json()["id"]

    # Publish Child Sub-Workflow
    await client.post(f"/api/v1/workflows/{child_wf_id}/publish", headers=headers)

    # 2. Create Parent Master Workflow
    parent_nodes = [
        {"id": "parent-wh", "type": "webhook", "position": {"x": 0, "y": 0}, "data": {}},
        {"id": "parent-sub", "type": "execute-workflow", "position": {"x": 200, "y": 0}, "data": {"config": {"target_workflow_id": child_wf_id}}}
    ]
    parent_conns = [{"id": "p1", "source": "parent-wh", "target": "parent-sub"}]

    parent_wf_res = await client.post("/api/v1/workflows", json={"name": "Parent Master Workflow", "nodes": parent_nodes, "connections": parent_conns}, headers=headers)
    assert parent_wf_res.status_code == 201
    parent_wf_id = parent_wf_res.json()["id"]

    # Publish & Activate Parent Workflow
    await client.post(f"/api/v1/workflows/{parent_wf_id}/publish", headers=headers)
    await client.post(f"/api/v1/workflows/{parent_wf_id}/activate", headers=headers)

    # 3. Execute Parent Workflow
    exec_res = await client.post(f"/api/v1/workflows/{parent_wf_id}/execute", json={"msg": "hello from parent"}, headers=headers)
    assert exec_res.status_code == 201
    exec_id = exec_res.json()["id"]

    exec_log = None
    for _ in range(20):
        await asyncio.sleep(0.1)
        db.expire_all()
        exec_log = (await db.execute(select(ExecutionLog).filter(ExecutionLog.id == exec_id))).scalars().first()
        if exec_log and exec_log.status in ("SUCCESS", "FAILED"):
            break

    assert exec_log is not None
    assert exec_log.status == "SUCCESS"
    assert exec_log.output_data["child_processed"] == "true"


@pytest.mark.asyncio
async def test_loop_items_execution(client: AsyncClient, db_session: AsyncSession, run_celery_eager):
    email = get_random_email()
    password = "pass123password"
    db = db_session

    reg_res = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    nodes = [
        {"id": "wh-1", "type": "webhook", "position": {"x": 0, "y": 0}, "data": {}},
        {"id": "loop-1", "type": "loop-items", "position": {"x": 200, "y": 0}, "data": {"config": {"items_path": "{{ $json.items }}", "max_iterations": 10}}}
    ]
    conns = [{"id": "e1", "source": "wh-1", "target": "loop-1"}]

    wf_res = await client.post("/api/v1/workflows", json={"name": "Loop Test Workflow", "nodes": nodes, "connections": conns}, headers=headers)
    assert wf_res.status_code == 201
    wf_id = wf_res.json()["id"]

    await client.post(f"/api/v1/workflows/{wf_id}/publish", headers=headers)
    await client.post(f"/api/v1/workflows/{wf_id}/activate", headers=headers)

    exec_payload = {"items": ["apple", "banana", "cherry"]}
    exec_res = await client.post(f"/api/v1/workflows/{wf_id}/execute", json=exec_payload, headers=headers)
    assert exec_res.status_code == 201
    exec_id = exec_res.json()["id"]

    exec_log = None
    for _ in range(20):
        await asyncio.sleep(0.1)
        db.expire_all()
        exec_log = (await db.execute(select(ExecutionLog).filter(ExecutionLog.id == exec_id))).scalars().first()
        if exec_log and exec_log.status in ("SUCCESS", "FAILED"):
            break

    assert exec_log is not None
    assert exec_log.status == "SUCCESS"
    assert exec_log.output_data["total_processed"] == 3
    assert exec_log.output_data["items"][0]["item"] == "apple"
    assert exec_log.output_data["items"][1]["item"] == "banana"
    assert exec_log.output_data["items"][2]["item"] == "cherry"



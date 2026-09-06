import pytest
from app.core.rag import chunk_text, compute_embedding, cosine_similarity, index_document_chunks, search_vector_store
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.models.workflow import Workflow
from app.models.workflow_version import WorkflowVersion
from app.models.execution_log import ExecutionLog
from app.models.document_embedding import DocumentEmbedding
from app.core.executor import WorkflowExecutor
from sqlalchemy import select

@pytest.mark.asyncio
async def test_chunk_text_basic():
    text = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five."
    chunks = chunk_text(text, chunk_size=30, overlap=5)
    assert len(chunks) > 1
    assert all(len(c) <= 35 for c in chunks)

@pytest.mark.asyncio
async def test_cosine_similarity_math():
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [1.0, 0.0, 0.0]
    vec_c = [0.0, 1.0, 0.0]

    assert round(cosine_similarity(vec_a, vec_b), 4) == 1.0
    assert round(cosine_similarity(vec_a, vec_c), 4) == 0.0

@pytest.mark.asyncio
async def test_multi_tenant_workspace_vector_isolation(db_session):
    db = db_session

    # Workspace A
    wsp_a = Workspace(name="Workspace Alpha")
    # Workspace B
    wsp_b = Workspace(name="Workspace Beta")
    db.add_all([wsp_a, wsp_b])
    await db.flush()

    # Index document in Workspace A
    doc_a_text = "NexFlow supports automated enterprise webhooks and REST triggers."
    await index_document_chunks(db, workspace_id=wsp_a.id, document_name="Alpha_Docs.txt", text=doc_a_text)

    # Index document in Workspace B
    doc_b_text = "Quantum computing relies on qubits and superposition states."
    await index_document_chunks(db, workspace_id=wsp_b.id, document_name="Beta_Physics.txt", text=doc_b_text)

    # Query Workspace A
    results_a = await search_vector_store(db, workspace_id=wsp_a.id, query_text="webhooks and REST", top_k=5)
    assert len(results_a) > 0
    assert all(r["document_name"] == "Alpha_Docs.txt" for r in results_a)
    # Ensure NO Workspace B documents leaked into Workspace A query
    assert not any(r["document_name"] == "Beta_Physics.txt" for r in results_a)

    # Query Workspace B - ensure ONLY Workspace B document is returned, zero Workspace A document leakage
    results_b = await search_vector_store(db, workspace_id=wsp_b.id, query_text="webhooks and REST", top_k=5)
    assert len(results_b) > 0
    assert all(r["document_name"] == "Beta_Physics.txt" for r in results_b)
    assert not any(r["document_name"] == "Alpha_Docs.txt" for r in results_b)

@pytest.mark.asyncio
async def test_executor_rag_workflow(db_session):
    import uuid
    db = db_session
    uid = uuid.uuid4().hex[:8]

    # Setup User & Workspace
    user = User(email=f"rag_executor_{uid}@example.com", hashed_password="hashed_pass")
    db.add(user)
    await db.flush()

    workspace = Workspace(name="RAG Execution Workspace")
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
    db.add(member)

    # Pre-index vector knowledge into workspace
    kb_text = "NexFlow deployment requires Python 3.11+, PostgreSQL 15, and Redis 7."
    await index_document_chunks(db, workspace_id=workspace.id, document_name="Deployment_Guide.txt", text=kb_text)

    # Create Workflow & Version with RAG retriever node
    workflow = Workflow(workspace_id=workspace.id, name="RAG Pipeline Flow")
    db.add(workflow)
    await db.flush()

    version = WorkflowVersion(
        workflow_id=workflow.id,
        version=1,
        nodes=[
            {
                "id": "node_webhook",
                "type": "webhook",
                "data": {"label": "Customer Query Inbound"}
            },
            {
                "id": "node_rag",
                "type": "rag-retriever",
                "data": {
                    "label": "KB Retriever",
                    "config": {
                        "query": "{{ $json.question }}",
                        "top_k": 3
                    }
                }
            },
            {
                "id": "node_ai",
                "type": "ai-prompt",
                "data": {
                    "label": "Grounding AI Agent",
                    "config": {
                        "user_prompt": "Answer the question: {{ $json.question }} based on context: {{ $node.node_rag.context }}"
                    }
                }
            }
        ],
        connections=[
            {"source": "node_webhook", "target": "node_rag"},
            {"source": "node_rag", "target": "node_ai"}
        ]
    )
    db.add(version)
    await db.flush()

    exec_log = ExecutionLog(
        workflow_id=workflow.id,
        version_id=version.id,
        status="PENDING",
        trigger_type="webhook",
        input_data={"question": "What PostgreSQL version is required for NexFlow?"}
    )
    db.add(exec_log)
    await db.commit()

    # Execute workflow
    executor = WorkflowExecutor(db)
    await executor.execute_workflow(exec_log.id)

    # Verify execution log
    await db.refresh(exec_log)
    assert exec_log.status == "SUCCESS"
    assert exec_log.node_executions is not None
    assert len(exec_log.node_executions) == 3

    rag_log = next(n for n in exec_log.node_executions if n["node_id"] == "node_rag")
    assert rag_log["status"] == "SUCCESS"
    assert "Deployment_Guide.txt" in rag_log["outputs"]["context"]
    assert "PostgreSQL 15" in rag_log["outputs"]["context"]

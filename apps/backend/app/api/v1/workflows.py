from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_current_active_workspace, RoleChecker
from app.db.session import get_db
from app.models.workflow import Workflow
from app.models.workflow_version import WorkflowVersion
from app.models.execution_log import ExecutionLog
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowOut, WorkflowVersionOut
from app.schemas.execution import ExecutionLogOut
from app.tasks import execute_workflow_task

router = APIRouter()

@router.get("", response_model=List[WorkflowOut])
async def list_workflows(
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    List all workflows scoped to the resolved workspace.
    """
    query = select(Workflow).filter(Workflow.workspace_id == workspace.id).order_by(Workflow.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_in: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Create a new workflow draft in the active workspace.
    """
    new_workflow = Workflow(
        workspace_id=workspace.id,
        name=workflow_in.name,
        description=workflow_in.description,
        nodes=workflow_in.nodes,
        connections=workflow_in.connections
    )
    db.add(new_workflow)
    await db.commit()
    await db.refresh(new_workflow)
    return new_workflow

@router.get("/analytics/summary")
async def get_workspace_analytics_summary(
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    Retrieve workspace-wide aggregated execution analytics and health summary.
    """
    wf_query = select(Workflow).filter(Workflow.workspace_id == workspace.id)
    wf_res = await db.execute(wf_query)
    workflows = wf_res.scalars().all()
    
    total_workflows = len(workflows)
    active_workflows = sum(1 for wf in workflows if wf.is_active)
    workflow_ids = [wf.id for wf in workflows]

    if not workflow_ids:
        return {
            "total_workflows": 0,
            "active_workflows": 0,
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "success_rate_percent": 0.0,
            "recent_activity": []
        }

    exec_query = select(ExecutionLog).filter(
        ExecutionLog.workflow_id.in_(workflow_ids)
    ).order_by(ExecutionLog.created_at.desc())
    exec_res = await db.execute(exec_query)
    exec_logs = exec_res.scalars().all()

    total_executions = len(exec_logs)
    successful_executions = sum(1 for log in exec_logs if log.status == "SUCCESS")
    failed_executions = sum(1 for log in exec_logs if log.status == "FAILED")
    
    success_rate = (successful_executions / total_executions * 100.0) if total_executions > 0 else 0.0
    wf_name_map = {wf.id: wf.name for wf in workflows}

    recent_activity = []
    for log in exec_logs[:15]:
        duration_sec = None
        if log.started_at and log.finished_at:
            duration_sec = round((log.finished_at - log.started_at).total_seconds(), 2)

        recent_activity.append({
            "id": log.id,
            "workflow_id": log.workflow_id,
            "workflow_name": wf_name_map.get(log.workflow_id, "Unknown Workflow"),
            "status": log.status,
            "trigger_type": log.trigger_type,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "duration_sec": duration_sec
        })

    return {
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "total_executions": total_executions,
        "successful_executions": successful_executions,
        "failed_executions": failed_executions,
        "success_rate_percent": round(success_rate, 1),
        "recent_activity": recent_activity
    }

@router.get("/{id}", response_model=WorkflowOut)
async def get_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    Retrieve full details of a specific workflow.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found in this workspace."
        )
    return workflow

@router.put("/{id}", response_model=WorkflowOut)
async def update_workflow(
    id: str,
    workflow_in: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Update a workflow draft definition.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    # Update draft fields
    if workflow_in.name is not None:
        workflow.name = workflow_in.name
    if workflow_in.description is not None:
        workflow.description = workflow_in.description
    if workflow_in.nodes is not None:
        workflow.nodes = workflow_in.nodes
    if workflow_in.connections is not None:
        workflow.connections = workflow_in.connections

    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin"]))
):
    """
    Delete a workflow from the workspace. Only Owner and Admin roles allowed.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    await db.delete(workflow)
    await db.commit()
    return {"detail": "Workflow deleted successfully"}

@router.post("/{id}/duplicate", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def duplicate_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Clone a workflow definition inside the active workspace.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    # Clone the metadata & graph
    duplicated_workflow = Workflow(
        workspace_id=workspace.id,
        name=f"{workflow.name} - Copy",
        description=workflow.description,
        nodes=workflow.nodes,
        connections=workflow.connections,
        is_active=False  # Duplicated workflows are always inactive by default
    )
    db.add(duplicated_workflow)
    await db.commit()
    await db.refresh(duplicated_workflow)
    return duplicated_workflow

@router.post("/{id}/publish", response_model=WorkflowVersionOut, status_code=status.HTTP_201_CREATED)
async def publish_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Snapshot the current draft graph layout as an immutable published version.
    Automatically increments version number sequence and updates active pointer.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    # 1. Resolve next sequential version number
    version_query = select(func.max(WorkflowVersion.version)).filter(
        WorkflowVersion.workflow_id == workflow.id
    )
    version_result = await db.execute(version_query)
    max_version = version_result.scalar()
    next_version = (max_version or 0) + 1

    # 2. Create the snapshot version
    new_version = WorkflowVersion(
        workflow_id=workflow.id,
        version=next_version,
        nodes=workflow.nodes,
        connections=workflow.connections
    )
    db.add(new_version)
    await db.flush()  # Generates new_version.id

    # 3. Update the active version pointer in the parent workflow
    workflow.active_version_id = new_version.id
    await db.commit()
    await db.refresh(new_version)
    return new_version

@router.post("/{id}/activate", response_model=WorkflowOut)
async def activate_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Activate a workflow to run automatically on triggers.
    Requires at least one published version.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    if not workflow.active_version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate a workflow that has never been published. Publish a version first."
        )

    workflow.is_active = True
    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.post("/{id}/deactivate", response_model=WorkflowOut)
async def deactivate_workflow(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Deactivate a workflow from running automatically.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    workflow.is_active = False
    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.get("/{id}/versions", response_model=List[WorkflowVersionOut])
async def list_workflow_versions(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    List history version snapshots for a workflow.
    """
    # Verify workflow ownership
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    versions_query = select(WorkflowVersion).filter(
        WorkflowVersion.workflow_id == id
    ).order_by(WorkflowVersion.version.desc())
    versions_result = await db.execute(versions_query)
    return versions_result.scalars().all()

@router.post("/{id}/execute", response_model=ExecutionLogOut, status_code=status.HTTP_201_CREATED)
async def execute_workflow(
    id: str,
    input_data: dict = Body(default=dict),
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace),
    _member = Depends(RoleChecker(["owner", "admin", "editor"]))
):
    """
    Manually trigger workflow execution asynchronously.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )
    
    if not workflow.active_version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow must have a published active version before execution."
        )

    # Create execution log
    exec_log = ExecutionLog(
        workflow_id=workflow.id,
        version_id=workflow.active_version_id,
        status="PENDING",
        trigger_type="manual",
        input_data=input_data
    )
    db.add(exec_log)
    await db.commit()
    await db.refresh(exec_log)

    # Queue celery task
    execute_workflow_task.delay(exec_log.id)

    return exec_log

@router.get("/{id}/executions", response_model=List[ExecutionLogOut])
async def list_workflow_executions(
    id: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    Retrieve execution history logs for a workflow.
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    execs_query = select(ExecutionLog).filter(
        ExecutionLog.workflow_id == id
    ).order_by(ExecutionLog.created_at.desc())
    execs_result = await db.execute(execs_query)
    return execs_result.scalars().all()

@router.get("/{id}/versions/diff", status_code=status.HTTP_200_OK)
async def compare_workflow_versions(
    id: str,
    v1: str,
    v2: str,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    Computes a visual version diff between snapshot version v1 and version v2 (or 'draft').
    """
    query = select(Workflow).filter(
        Workflow.id == id,
        Workflow.workspace_id == workspace.id
    )
    result = await db.execute(query)
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    # Resolve v1 snapshot
    if v1 == "draft":
        v1_nodes = workflow.nodes or []
        v1_conns = workflow.connections or []
    else:
        v1_query = select(WorkflowVersion).filter(WorkflowVersion.id == v1, WorkflowVersion.workflow_id == id)
        v1_res = await db.execute(v1_query)
        v1_obj = v1_res.scalars().first()
        if not v1_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version snapshot '{v1}' not found.")
        v1_nodes = v1_obj.nodes or []
        v1_conns = v1_obj.connections or []

    # Resolve v2 snapshot
    if v2 == "draft":
        v2_nodes = workflow.nodes or []
        v2_conns = workflow.connections or []
    else:
        v2_query = select(WorkflowVersion).filter(WorkflowVersion.id == v2, WorkflowVersion.workflow_id == id)
        v2_res = await db.execute(v2_query)
        v2_obj = v2_res.scalars().first()
        if not v2_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Version snapshot '{v2}' not found.")
        v2_nodes = v2_obj.nodes or []
        v2_conns = v2_obj.connections or []

    nodes_v1 = {n["id"]: n for n in v1_nodes}
    nodes_v2 = {n["id"]: n for n in v2_nodes}

    added_nodes = [n for nid, n in nodes_v2.items() if nid not in nodes_v1]
    deleted_nodes = [n for nid, n in nodes_v1.items() if nid not in nodes_v2]

    modified_nodes = []
    for nid, n2 in nodes_v2.items():
        if nid in nodes_v1:
            n1 = nodes_v1[nid]
            c1 = n1.get("config", {}) or n1.get("data", {}).get("config", {})
            c2 = n2.get("config", {}) or n2.get("data", {}).get("config", {})
            if c1 != c2 or n1.get("name") != n2.get("name") or n1.get("type") != n2.get("type"):
                modified_nodes.append({
                    "id": nid,
                    "name": n2.get("name") or n2.get("type"),
                    "type": n2.get("type"),
                    "before": {"name": n1.get("name"), "type": n1.get("type"), "config": c1},
                    "after": {"name": n2.get("name"), "type": n2.get("type"), "config": c2}
                })

    conn_set_1 = {f"{c.get('source')}:{c.get('sourcePort', 'main')}->{c.get('target')}:{c.get('targetPort', 'main')}" for c in v1_conns}
    conn_set_2 = {f"{c.get('source')}:{c.get('sourcePort', 'main')}->{c.get('target')}:{c.get('targetPort', 'main')}" for c in v2_conns}

    added_conns = list(conn_set_2 - conn_set_1)
    deleted_conns = list(conn_set_1 - conn_set_2)

    return {
        "workflow_id": id,
        "v1": v1,
        "v2": v2,
        "summary": {
            "added_count": len(added_nodes),
            "deleted_count": len(deleted_nodes),
            "modified_count": len(modified_nodes),
            "added_connections_count": len(added_conns),
            "deleted_connections_count": len(deleted_conns)
        },
        "added_nodes": added_nodes,
        "deleted_nodes": deleted_nodes,
        "modified_nodes": modified_nodes,
        "added_connections": added_conns,
        "deleted_connections": deleted_conns
    }

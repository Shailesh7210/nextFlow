from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_current_active_workspace, RoleChecker
from app.db.session import get_db
from app.models.workflow import Workflow
from app.models.workflow_version import WorkflowVersion
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowOut, WorkflowVersionOut

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

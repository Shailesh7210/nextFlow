from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_workspace, get_db
from app.models.approval_request import ApprovalRequest
from app.models.execution_log import ExecutionLog
from app.models.workflow import Workflow
from app.core.executor import WorkflowExecutor

router = APIRouter()

class ApprovalResponseSchema(BaseModel):
    action: str  # "approve" or "reject"
    decider_email: Optional[str] = None

@router.get("/pending", status_code=status.HTTP_200_OK)
async def list_pending_approvals(
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    Lists pending human approval requests for the active workspace.
    """
    stmt = (
        select(ApprovalRequest, ExecutionLog, Workflow.name.label("workflow_name"))
        .join(ExecutionLog, ApprovalRequest.execution_id == ExecutionLog.id)
        .join(Workflow, ExecutionLog.workflow_id == Workflow.id)
        .filter(
            Workflow.workspace_id == workspace.id,
            ApprovalRequest.status == "PENDING"
        )
        .order_by(ApprovalRequest.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    pending_list = []
    for approval, exec_log, wf_name in rows:
        pending_list.append({
            "id": approval.id,
            "execution_id": approval.execution_id,
            "workflow_name": wf_name,
            "node_id": approval.node_id,
            "approver_email": approval.approver_email,
            "message": approval.message,
            "token": approval.token,
            "status": approval.status,
            "created_at": approval.created_at.isoformat()
        })
    return pending_list

@router.post("/{token}/respond", status_code=status.HTTP_200_OK)
async def respond_to_approval(
    token: str,
    payload: ApprovalResponseSchema,
    db: AsyncSession = Depends(get_db),
    workspace = Depends(get_current_active_workspace)
):
    """
    Submits an approval decision (approve or reject) and resumes workflow graph traversal.
    """
    if payload.action not in ("approve", "reject"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be either 'approve' or 'reject'."
        )

    stmt = select(ApprovalRequest).filter(ApprovalRequest.token == token)
    res = await db.execute(stmt)
    approval = res.scalars().first()

    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval request with the provided token not found."
        )

    if approval.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval request has already been decided ({approval.status})."
        )

    executor = WorkflowExecutor(db)
    try:
        decider = payload.decider_email or "admin@company.com"
        resumed_output = await executor.resume_workflow_execution(
            execution_id=approval.execution_id,
            token=token,
            action=payload.action,
            decider_email=decider
        )
        return {
            "status": "RESUMED",
            "approval_status": approval.status,
            "execution_id": approval.execution_id,
            "output": resumed_output
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume workflow execution: {str(e)}"
        )

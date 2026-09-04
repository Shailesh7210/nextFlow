from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.workflow import Workflow
from app.models.execution_log import ExecutionLog
from app.schemas.execution import ExecutionLogOut
from app.tasks import execute_workflow_task

router = APIRouter()

@router.post("/{workflow_id}", response_model=ExecutionLogOut, status_code=status.HTTP_202_ACCEPTED)
@router.post("/{workflow_id}/{subpath:path}", response_model=ExecutionLogOut, status_code=status.HTTP_202_ACCEPTED)
async def handle_inbound_webhook(
    workflow_id: str,
    request: Request,
    subpath: str = "",
    db: AsyncSession = Depends(get_db)
):
    """
    Public inbound webhook receiver endpoint.
    Accepts POST requests, captures headers, query parameters, and body payloads,
    and dispatches workflow execution asynchronously.
    """
    # 1. Fetch workflow by ID
    query = select(Workflow).filter(Workflow.id == workflow_id)
    result = await db.execute(query)
    workflow = result.scalars().first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found."
        )

    # 2. Verify workflow activation state
    if not workflow.is_active or not workflow.active_version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow is not active or has no published active snapshot version."
        )

    # 3. Extract request payload
    query_params = dict(request.query_params)
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("authorization", "cookie")}
    
    try:
        body = await request.json()
    except Exception:
        body_bytes = await request.body()
        body = body_bytes.decode(errors="ignore")

    input_payload = {
        "headers": headers,
        "query": query_params,
        "body": body,
        "subpath": subpath
    }

    # 4. Create PENDING execution log
    exec_log = ExecutionLog(
        workflow_id=workflow.id,
        version_id=workflow.active_version_id,
        status="PENDING",
        trigger_type="webhook",
        input_data=input_payload
    )
    db.add(exec_log)
    await db.commit()
    await db.refresh(exec_log)

    # 5. Dispatch async execution task
    execute_workflow_task.delay(exec_log.id)

    return exec_log

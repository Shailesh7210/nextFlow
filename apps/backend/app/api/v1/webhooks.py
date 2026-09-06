import json
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.workflow import Workflow
from app.models.execution_log import ExecutionLog
from app.core.executor import WorkflowExecutor
from app.tasks import execute_workflow_task

router = APIRouter()

@router.post("/{workflow_id}")
@router.post("/{workflow_id}/{subpath:path}")
async def handle_inbound_webhook(
    workflow_id: str,
    request: Request,
    subpath: str = "",
    sync: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Public inbound webhook receiver endpoint.
    Accepts POST requests, captures headers, query parameters, and body payloads,
    and dispatches workflow execution either asynchronously or synchronously.
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

    is_sync = sync or query_params.get("sync", "").lower() == "true" or subpath == "sync"

    if is_sync:
        # Synchronous inline execution
        executor = WorkflowExecutor(db)
        await executor.execute_workflow(exec_log.id)
        await db.refresh(exec_log)

        output_data = exec_log.output_data or {}
        if isinstance(output_data, dict) and "_response_status" in output_data:
            resp_status = output_data["_response_status"]
            resp_body = output_data.get("_response_body", {})
            resp_headers = output_data.get("_response_headers", {})

            if isinstance(resp_body, (dict, list)):
                content = json.dumps(resp_body)
                media_type = "application/json"
            else:
                content = str(resp_body)
                media_type = "text/plain"

            return Response(content=content, status_code=resp_status, headers=resp_headers, media_type=media_type)
        else:
            return Response(content=json.dumps(output_data), status_code=status.HTTP_200_OK, media_type="application/json")

    # 5. Dispatch async execution task
    execute_workflow_task.delay(exec_log.id)

    return JSONResponse(
        content={
            "id": exec_log.id,
            "workflow_id": exec_log.workflow_id,
            "status": exec_log.status,
            "trigger_type": exec_log.trigger_type
        },
        status_code=status.HTTP_202_ACCEPTED
    )

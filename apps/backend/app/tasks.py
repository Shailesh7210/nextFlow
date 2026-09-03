import asyncio
import logging
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.core.executor import WorkflowExecutor

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.execute_workflow_task")
def execute_workflow_task(execution_log_id: str):
    """
    Background worker task to execute a workflow graph traversal.
    """
    logger.info(f"Celery task received to execute workflow log {execution_log_id}")
    
    async def _run():
        async with SessionLocal() as db:
            executor = WorkflowExecutor(db)
            await executor.execute_workflow(execution_log_id)
            
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        # In a running loop (like tests), schedule and wait
        future = asyncio.run_coroutine_threadsafe(_run(), loop)
        future.result()
    else:
        loop.run_until_complete(_run())

    logger.info(f"Celery task finished for workflow log {execution_log_id}")

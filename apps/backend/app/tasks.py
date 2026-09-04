import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.celery_app import celery_app
from app.core.executor import WorkflowExecutor

logger = logging.getLogger(__name__)

async def run_workflow_execution(execution_log_id: str):
    # Dynamically bind engine to current event loop
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            executor = WorkflowExecutor(db)
            await executor.execute_workflow(execution_log_id)
    finally:
        await engine.dispose()

@celery_app.task(name="app.tasks.execute_workflow_task")
def execute_workflow_task(execution_log_id: str):
    """
    Background worker task to execute a workflow graph traversal.
    """
    logger.info(f"Celery task received to execute workflow log {execution_log_id}")
    
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Schedule on the active running loop (e.g. during eager execution / tests)
        loop.create_task(run_workflow_execution(execution_log_id))
    else:
        # Execute in worker thread event loop
        asyncio.run(run_workflow_execution(execution_log_id))

    logger.info(f"Celery task dispatched for workflow log {execution_log_id}")

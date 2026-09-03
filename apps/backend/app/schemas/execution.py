from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict

class ExecutionLogOut(BaseModel):
    id: str
    workflow_id: str
    version_id: Optional[str] = None
    status: str
    trigger_type: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    node_executions: List[Dict[str, Any]]
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

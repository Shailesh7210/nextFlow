from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[Dict[str, Any]] = []
    connections: List[Dict[str, Any]] = []

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    connections: Optional[List[Dict[str, Any]]] = None

class WorkflowOut(WorkflowBase):
    id: str
    workspace_id: str
    is_active: bool
    active_version_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkflowVersionOut(BaseModel):
    id: str
    workflow_id: str
    version: int
    nodes: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

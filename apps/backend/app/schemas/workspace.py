from datetime import datetime
from pydantic import BaseModel, ConfigDict

class WorkspaceBase(BaseModel):
    name: str

class WorkspaceOut(WorkspaceBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base
from app.core.ids import generate_id

class WorkflowVersion(Base):
    __tablename__ = "workflow_versions"

    id: Mapped[str] = mapped_column(
        String(32), 
        primary_key=True, 
        default=lambda: generate_id("wfv")
    )
    workflow_id: Mapped[str] = mapped_column(
        String(32), 
        ForeignKey("workflows.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    version: Mapped[int] = mapped_column(
        Integer, 
        nullable=False
    )
    nodes: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, 
        nullable=False
    )
    connections: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, 
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("workflow_id", "version", name="uq_workflow_version"),
    )

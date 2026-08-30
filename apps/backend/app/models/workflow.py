from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base
from app.core.ids import generate_id

class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(
        String(32), 
        primary_key=True, 
        default=lambda: generate_id("wfs")
    )
    workspace_id: Mapped[str] = mapped_column(
        String(32), 
        ForeignKey("workspaces.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(255), 
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        String(1000), 
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, 
        default=False, 
        nullable=False
    )
    # References the active WorkflowVersion.id snapshot
    active_version_id: Mapped[str] = mapped_column(
        String(32), 
        nullable=True
    )
    # Stores the draft graph elements
    nodes: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, 
        default=list, 
        nullable=False
    )
    connections: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, 
        default=list, 
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

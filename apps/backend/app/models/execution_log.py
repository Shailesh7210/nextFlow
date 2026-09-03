from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy import String, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base
from app.core.ids import generate_id

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id: Mapped[str] = mapped_column(
        String(32), 
        primary_key=True, 
        default=lambda: generate_id("exl")
    )
    workflow_id: Mapped[str] = mapped_column(
        String(32), 
        ForeignKey("workflows.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    version_id: Mapped[str] = mapped_column(
        String(32), 
        ForeignKey("workflow_versions.id", ondelete="SET NULL"), 
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50), 
        default="PENDING", 
        nullable=False
    )
    trigger_type: Mapped[str] = mapped_column(
        String(50), 
        nullable=False
    )
    input_data: Mapped[Dict[str, Any]] = mapped_column(
        JSON, 
        default=dict, 
        nullable=False
    )
    output_data: Mapped[Dict[str, Any]] = mapped_column(
        JSON, 
        default=dict, 
        nullable=False
    )
    node_executions: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, 
        default=list, 
        nullable=False
    )
    error_message: Mapped[str] = mapped_column(
        String(1000), 
        nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    finished_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

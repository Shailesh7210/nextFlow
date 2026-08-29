from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base
from app.core.ids import generate_id

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id: Mapped[str] = mapped_column(
        String(32), 
        primary_key=True, 
        default=lambda: generate_id("wsm")
    )
    workspace_id: Mapped[str] = mapped_column(
        String(32), 
        ForeignKey("workspaces.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(32), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50), 
        nullable=False  # owner, admin, editor, viewer
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

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

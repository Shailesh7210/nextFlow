from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base
from app.core.ids import generate_id

class Credential(Base):
    __tablename__ = "credentials"

    id: Mapped[str] = mapped_column(
        String(32), 
        primary_key=True, 
        default=lambda: generate_id("crd")
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
    type: Mapped[str] = mapped_column(
        String(64), 
        nullable=False
    )
    # Encrypted data payload storing sensitive parameters
    encrypted_data: Mapped[str] = mapped_column(
        Text, 
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

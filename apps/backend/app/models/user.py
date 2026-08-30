from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base
from app.core.ids import generate_id

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(32), 
        primary_key=True, 
        default=lambda: generate_id("usr")
    )
    email: Mapped[str] = mapped_column(
        String(255), 
        unique=True, 
        index=True, 
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(255), 
        nullable=True
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), 
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, 
        default=True, 
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

from typing import Any
from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    id: Any
    __name__: str

    # Generate __tablename__ automatically from class name in snake_case
    @declared_attr.directive
    def __tablename__(cls) -> str:
        import re
        name = cls.__name__
        # Convert CamelCase to snake_case (e.g. WorkflowVersion -> workflow_version)
        name = re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
        # Handle plurals or keep singular? Keeping simple snake_case is clean, 
        # but let's make sure it matches the table names in schema.
        # Let's check table names in blueprint: users, workspaces, workflows, etc.
        # It's usually better to define __tablename__ explicitly in models if we want exact matches like 'users' or 'workflows'.
        # So we can just make this automatic converter a fallback, or define it explicitly in models.
        return name

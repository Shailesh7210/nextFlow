from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "NexFlow"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/nexflow")
    
    # Redis & Celery
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2")

    # Security
    SECRET_KEY: str = Field(default="dev-secret-key-change-in-production-12345")
    CREDENTIAL_ENCRYPTION_KEY: str = Field(default="32-character-base64-key-for-aes-gcm")

settings = Settings()

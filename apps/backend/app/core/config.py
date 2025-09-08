"""Application configuration."""

import os
from typing import List


class Settings:
    """Application settings."""

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql+asyncpg://postgres:12345@localhost:5432/postgres"
    )

    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]

    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Calendar Backend"


settings = Settings()


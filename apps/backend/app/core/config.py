"""Application configuration."""

import os
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings."""

    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]

    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Calendar Backend"

    # LLM API Keys
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")


settings = Settings()

"""Pydantic schemas for API requests and responses."""

from app.schemas.common import (
    EchoRequest,
    EchoResponse,
    SuggestRequest,
    SuggestResponse,
)

__all__ = [
    "EchoRequest",
    "EchoResponse",
    "SuggestRequest",
    "SuggestResponse",
]

"""Chat schemas."""

from typing import List, Literal, Optional
from datetime import datetime

from pydantic import BaseModel


class CreateThreadRequest(BaseModel):
    """Create thread request schema."""

    title: str
    model_provider: Literal["openai", "anthropic", "gemini"]
    model_name: str


class CreateThreadResponse(BaseModel):
    """Create thread response schema."""

    thread_id: int


class PostMessageRequest(BaseModel):
    """Post message request schema."""

    content: str


class MessageResponse(BaseModel):
    """Message response schema."""

    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class GetMessagesResponse(BaseModel):
    """Get messages response schema."""

    messages: List[MessageResponse]


class ThreadResponse(BaseModel):
    """Thread response schema."""

    id: int
    title: str
    model_provider: str
    model_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GetThreadsResponse(BaseModel):
    """Get threads response schema."""

    threads: List[ThreadResponse]


class UpdateThreadRequest(BaseModel):
    """Update thread request schema."""

    title: str


class UpdateThreadResponse(BaseModel):
    """Update thread response schema."""

    id: int
    title: str
    model_provider: str
    model_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeleteThreadResponse(BaseModel):
    """Delete thread response schema."""

    success: bool
    message: str

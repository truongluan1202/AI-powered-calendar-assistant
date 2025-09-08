"""Chat schemas."""

from typing import List, Literal, Optional
from datetime import datetime

from pydantic import BaseModel


class CreateSessionResponse(BaseModel):
    """Create session response schema."""

    session_id: str


class PostMessageRequest(BaseModel):
    """Post message request schema."""

    content: str
    model: Literal["openai", "gemini", "claude"] = "openai"


class MessageResponse(BaseModel):
    """Message response schema."""

    id: int
    role: str
    content: str
    model: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GetMessagesResponse(BaseModel):
    """Get messages response schema."""

    messages: List[MessageResponse]



"""Session schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SessionCreate(BaseModel):
    """Session creation schema."""

    user_id: int
    session_token: str
    expires: datetime


class SessionResponse(BaseModel):
    """Session response schema."""

    id: int
    user_id: int
    session_token: str
    expires: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

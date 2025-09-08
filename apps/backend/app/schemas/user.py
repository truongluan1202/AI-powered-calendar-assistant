"""User schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """User creation schema."""

    email: EmailStr
    name: str
    image: Optional[str] = None
    timezone: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema."""

    id: int
    email: str
    name: str
    image: Optional[str] = None
    timezone: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

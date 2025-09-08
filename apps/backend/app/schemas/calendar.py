"""Calendar schemas."""

from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel


class CalendarEventCreate(BaseModel):
    """Calendar event creation schema."""

    user_id: int
    provider: str
    provider_email: str
    calendar_id: str
    external_event_id: str
    status: str
    summary: str
    start_ts: datetime
    end_ts: datetime
    timezone: str
    etag: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[Dict[str, Any]] = None
    source: Optional[Dict[str, Any]] = None


class CalendarEventResponse(BaseModel):
    """Calendar event response schema."""

    id: int
    user_id: int
    provider: str
    provider_email: str
    calendar_id: str
    external_event_id: str
    etag: Optional[str] = None
    status: str
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_ts: datetime
    end_ts: datetime
    timezone: str
    attendees: Optional[Dict[str, Any]] = None
    source: Optional[Dict[str, Any]] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CalendarEventUpdate(BaseModel):
    """Calendar event update schema."""

    status: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_ts: Optional[datetime] = None
    end_ts: Optional[datetime] = None
    timezone: Optional[str] = None
    attendees: Optional[Dict[str, Any]] = None
    source: Optional[Dict[str, Any]] = None
    etag: Optional[str] = None

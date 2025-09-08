"""Pydantic schemas for API requests and responses."""

from app.schemas.user import UserCreate, UserResponse
from app.schemas.account import AccountCreate, AccountResponse
from app.schemas.session import SessionCreate, SessionResponse
from app.schemas.chat import (
    CreateThreadRequest,
    CreateThreadResponse,
    PostMessageRequest,
    MessageResponse,
    GetMessagesResponse,
    ThreadResponse,
    GetThreadsResponse,
)
from app.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)
from app.schemas.common import (
    EchoRequest,
    EchoResponse,
    SuggestRequest,
    SuggestResponse,
)

__all__ = [
    "UserCreate",
    "UserResponse",
    "AccountCreate",
    "AccountResponse",
    "SessionCreate",
    "SessionResponse",
    "CreateThreadRequest",
    "CreateThreadResponse",
    "PostMessageRequest",
    "MessageResponse",
    "GetMessagesResponse",
    "ThreadResponse",
    "GetThreadsResponse",
    "CalendarEventCreate",
    "CalendarEventResponse",
    "CalendarEventUpdate",
    "EchoRequest",
    "EchoResponse",
    "SuggestRequest",
    "SuggestResponse",
]

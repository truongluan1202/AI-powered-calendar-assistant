"""Calendar event model."""

from datetime import datetime
from typing import Optional, Literal

from sqlalchemy import (
    DateTime,
    Integer,
    String,
    Text,
    ForeignKey,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CalendarEvent(Base):
    """Calendar event model (mirror of Google event)."""

    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # google
    provider_email: Mapped[str] = mapped_column(String(255), nullable=False)
    calendar_id: Mapped[str] = mapped_column(String(255), nullable=False)
    external_event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    etag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Event details
    status: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # confirmed, tentative, cancelled
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timing
    start_ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), nullable=False)

    # Additional data
    attendees: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    source: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Metadata
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="calendar_events")

    # Unique constraint
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_email",
            "calendar_id",
            "external_event_id",
            name="unique_external_event",
        ),
    )

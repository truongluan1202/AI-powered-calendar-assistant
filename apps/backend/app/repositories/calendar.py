"""Calendar repository for database operations."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.calendar import CalendarEvent
from app.repositories.base import BaseRepository


class CalendarRepository(BaseRepository[CalendarEvent]):
    """Repository for calendar operations."""

    def __init__(self):
        super().__init__(CalendarEvent)

    async def get_by_external_id(
        self,
        db: AsyncSession,
        provider: str,
        provider_email: str,
        calendar_id: str,
        external_event_id: str,
    ) -> Optional[CalendarEvent]:
        """Get a calendar event by external ID."""
        result = await db.execute(
            select(CalendarEvent).where(
                and_(
                    CalendarEvent.provider == provider,
                    CalendarEvent.provider_email == provider_email,
                    CalendarEvent.calendar_id == calendar_id,
                    CalendarEvent.external_event_id == external_event_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(
        self, db: AsyncSession, user_id: int, include_deleted: bool = False
    ) -> List[CalendarEvent]:
        """Get all calendar events for a user."""
        query = select(CalendarEvent).where(CalendarEvent.user_id == user_id)

        if not include_deleted:
            query = query.where(CalendarEvent.deleted_at.is_(None))

        result = await db.execute(query.order_by(CalendarEvent.start_ts.asc()))
        return result.scalars().all()

    async def get_by_date_range(
        self,
        db: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> List[CalendarEvent]:
        """Get calendar events within a date range."""
        result = await db.execute(
            select(CalendarEvent)
            .where(
                and_(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_ts >= start_date,
                    CalendarEvent.end_ts <= end_date,
                    CalendarEvent.deleted_at.is_(None),
                )
            )
            .order_by(CalendarEvent.start_ts.asc())
        )
        return result.scalars().all()

    async def create_event(
        self,
        db: AsyncSession,
        user_id: int,
        provider: str,
        provider_email: str,
        calendar_id: str,
        external_event_id: str,
        status: str,
        summary: str,
        start_ts: datetime,
        end_ts: datetime,
        timezone: str,
        etag: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        attendees: Optional[dict] = None,
        source: Optional[dict] = None,
    ) -> CalendarEvent:
        """Create a new calendar event."""
        return await self.create(
            db,
            user_id=user_id,
            provider=provider,
            provider_email=provider_email,
            calendar_id=calendar_id,
            external_event_id=external_event_id,
            etag=etag,
            status=status,
            summary=summary,
            description=description,
            location=location,
            start_ts=start_ts,
            end_ts=end_ts,
            timezone=timezone,
            attendees=attendees,
            source=source,
        )

    async def soft_delete_event(
        self, db: AsyncSession, event_id: int
    ) -> Optional[CalendarEvent]:
        """Soft delete a calendar event."""
        return await self.update(db, event_id, deleted_at=datetime.utcnow())

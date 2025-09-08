"""Session repository for database operations."""

from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.session import Session
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[Session]):
    """Repository for session operations."""

    def __init__(self):
        super().__init__(Session)

    async def get_by_token(
        self, db: AsyncSession, session_token: str
    ) -> Optional[Session]:
        """Get a session by session token."""
        result = await db.execute(
            select(Session).where(Session.session_token == session_token)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, db: AsyncSession, user_id: int) -> list[Session]:
        """Get all sessions for a user."""
        result = await db.execute(select(Session).where(Session.user_id == user_id))
        return result.scalars().all()

    async def create_session(
        self,
        db: AsyncSession,
        user_id: int,
        session_token: str,
        expires: datetime,
    ) -> Session:
        """Create a new session."""
        return await self.create(
            db,
            user_id=user_id,
            session_token=session_token,
            expires=expires,
        )

    async def delete_expired_sessions(self, db: AsyncSession) -> int:
        """Delete expired sessions."""
        result = await db.execute(
            select(Session).where(Session.expires < datetime.utcnow())
        )
        expired_sessions = result.scalars().all()

        for session in expired_sessions:
            await self.delete(db, session.id)

        return len(expired_sessions)

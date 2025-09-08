"""Chat repository for database operations."""

from typing import List, Optional
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.chat import ChatSession, Message
from app.repositories.base import BaseRepository


class ChatRepository(BaseRepository[ChatSession]):
    """Repository for chat operations."""

    def __init__(self):
        super().__init__(ChatSession)

    async def create_session(
        self, db: AsyncSession, user_id: Optional[int] = None
    ) -> ChatSession:
        """Create a new chat session."""
        session_id = str(uuid4())
        return await self.create(db, session_id=session_id, user_id=user_id)

    async def get_session_by_id(
        self, db: AsyncSession, session_id: str
    ) -> Optional[ChatSession]:
        """Get a chat session by session ID."""
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.session_id == session_id)
            .options(selectinload(ChatSession.messages))
        )
        return result.scalar_one_or_none()

    async def get_messages(self, db: AsyncSession, session_id: str) -> List[Message]:
        """Get all messages for a session."""
        result = await db.execute(
            select(Message)
            .join(ChatSession)
            .where(ChatSession.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        return result.scalars().all()

    async def add_message(
        self,
        db: AsyncSession,
        session_id: str,
        role: str,
        content: str,
        model: Optional[str] = None,
    ) -> Optional[Message]:
        """Add a message to a chat session."""
        # Get the session
        session = await self.get_session_by_id(db, session_id)
        if not session:
            return None

        # Create the message
        message = Message(
            session_id=session.id, role=role, content=content, model=model
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def get_user_sessions(
        self, db: AsyncSession, user_id: int
    ) -> List[ChatSession]:
        """Get all chat sessions for a user."""
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
        )
        return result.scalars().all()



"""Chat repository for database operations."""

from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.chat import ChatThread, ChatMessage
from app.repositories.base import BaseRepository


class ChatRepository(BaseRepository[ChatThread]):
    """Repository for chat operations."""

    def __init__(self):
        super().__init__(ChatThread)

    async def create_thread(
        self,
        db: AsyncSession,
        user_id: int,
        title: str,
        model_provider: str,
        model_name: str,
    ) -> ChatThread:
        """Create a new chat thread."""
        return await self.create(
            db,
            user_id=user_id,
            title=title,
            model_provider=model_provider,
            model_name=model_name,
        )

    async def get_thread_by_id(
        self, db: AsyncSession, thread_id: int
    ) -> Optional[ChatThread]:
        """Get a chat thread by ID."""
        result = await db.execute(
            select(ChatThread)
            .where(ChatThread.id == thread_id)
            .options(selectinload(ChatThread.messages))
        )
        return result.scalar_one_or_none()

    async def get_messages(self, db: AsyncSession, thread_id: int) -> List[ChatMessage]:
        """Get all messages for a thread."""
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc())
        )
        return result.scalars().all()

    async def add_message(
        self,
        db: AsyncSession,
        thread_id: int,
        role: str,
        content: str,
        user_id: Optional[int] = None,
    ) -> Optional[ChatMessage]:
        """Add a message to a chat thread."""
        # Verify thread exists
        thread = await self.get_thread_by_id(db, thread_id)
        if not thread:
            return None

        # Create the message
        message = ChatMessage(
            thread_id=thread_id, user_id=user_id, role=role, content=content
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def get_user_threads(
        self, db: AsyncSession, user_id: int
    ) -> List[ChatThread]:
        """Get all chat threads for a user."""
        result = await db.execute(
            select(ChatThread)
            .where(ChatThread.user_id == user_id)
            .order_by(ChatThread.created_at.desc())
        )
        return result.scalars().all()

    async def update_thread_title(
        self, db: AsyncSession, thread_id: int, title: str
    ) -> Optional[ChatThread]:
        """Update a thread's title."""
        thread = await self.get_thread_by_id(db, thread_id)
        if not thread:
            return None

        thread.title = title
        await db.commit()
        await db.refresh(thread)
        return thread

    async def delete_thread(self, db: AsyncSession, thread_id: int) -> bool:
        """Delete a thread and all its messages."""
        thread = await self.get_thread_by_id(db, thread_id)
        if not thread:
            return False

        # Delete all messages first
        from sqlalchemy import delete

        await db.execute(delete(ChatMessage).where(ChatMessage.thread_id == thread_id))

        # Delete the thread
        await db.delete(thread)
        await db.commit()
        return True

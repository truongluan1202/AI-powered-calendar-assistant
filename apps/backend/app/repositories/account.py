"""Account repository for database operations."""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.account import Account
from app.repositories.base import BaseRepository


class AccountRepository(BaseRepository[Account]):
    """Repository for account operations."""

    def __init__(self):
        super().__init__(Account)

    async def get_by_provider(
        self, db: AsyncSession, provider: str, provider_account_id: str
    ) -> Optional[Account]:
        """Get an account by provider and provider account ID."""
        result = await db.execute(
            select(Account).where(
                Account.provider == provider,
                Account.provider_account_id == provider_account_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, db: AsyncSession, user_id: int) -> list[Account]:
        """Get all accounts for a user."""
        result = await db.execute(select(Account).where(Account.user_id == user_id))
        return result.scalars().all()

    async def create_account(
        self,
        db: AsyncSession,
        user_id: int,
        provider: str,
        provider_account_id: str,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        expires_at: Optional[int] = None,
    ) -> Account:
        """Create a new account."""
        return await self.create(
            db,
            user_id=user_id,
            provider=provider,
            provider_account_id=provider_account_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )

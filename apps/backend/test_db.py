#!/usr/bin/env python3
"""Test script to verify database connectivity and models."""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from app.core.config import settings
from app.core.database import init_db, engine
from app.models import User, ChatSession, Message


async def test_database_connection():
    """Test the database connection and models."""
    print(f"Testing connection to: {settings.DATABASE_URL}")

    try:
        # Test basic connection
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            print(f"✅ Database connection successful! Test query result: {row[0]}")

        # Initialize database tables
        await init_db()
        print("✅ Database tables created successfully!")

        # Test model creation
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.core.database import AsyncSessionLocal
        from app.repositories.chat import ChatRepository
        from app.repositories.user import UserRepository
        from app.services.llm import LLMService

        async with AsyncSessionLocal() as session:
            # Test user creation
            user_repo = UserRepository()
            user = await user_repo.create_user(session, "test@example.com", "Test User")
            print(f"✅ User created: {user.email}")

            # Test chat thread creation
            chat_repo = ChatRepository()
            chat_thread = await chat_repo.create_thread(
                session, user.id, "Test Thread", "openai", "gpt-4"
            )
            print(f"✅ Chat thread created: {chat_thread.title}")

            # Test message creation
            message = await chat_repo.add_message(
                session, chat_thread.id, "user", "Hello, world!", user.id
            )
            print(f"✅ Message created: {message.content}")

            # Test message retrieval
            messages = await chat_repo.get_messages(session, chat_thread.id)
            print(f"✅ Retrieved {len(messages)} messages")

            # Test LLM service
            llm_service = LLMService()
            available_providers = llm_service.get_available_providers()
            print(f"✅ Available LLM providers: {available_providers}")

            if available_providers:
                print("✅ LLM service initialized successfully")
            else:
                print("⚠️  No LLM providers available (API keys not set)")

    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

    finally:
        await engine.dispose()

    return True


if __name__ == "__main__":
    success = asyncio.run(test_database_connection())
    if success:
        print("\n🎉 Database integration test completed successfully!")
    else:
        print("\n💥 Database integration test failed!")

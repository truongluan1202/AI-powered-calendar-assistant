#!/usr/bin/env python3
"""Test script to verify the backend can be imported without database dependencies."""

try:
    # Test importing the main application
    from app.main import app

    print("✅ Successfully imported main application")

    # Test importing core modules
    from app.core.config import settings

    print("✅ Successfully imported configuration")

    # Test importing services
    from app.services.llm import LLMService

    print("✅ Successfully imported LLM service")

    # Test importing API modules
    from app.api.v1.endpoints import chat, common

    print("✅ Successfully imported API endpoints")

    # Test importing schemas
    from app.schemas.common import EchoRequest, EchoResponse

    print("✅ Successfully imported schemas")

    print("\n🎉 All imports successful! Backend is stateless and ready to use.")
    print(f"📋 Available LLM providers: {list(LLMService().providers.keys())}")

except ImportError as e:
    print(f"❌ Import error: {e}")
    exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    exit(1)

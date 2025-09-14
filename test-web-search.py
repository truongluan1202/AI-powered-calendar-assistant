#!/usr/bin/env python3
"""Test script for web search functionality."""

import asyncio
import sys
import os

# Add the backend app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "apps", "backend"))

from app.services.web_search import web_search_service


async def test_web_search():
    """Test the web search functionality."""
    print("Testing web search functionality...")

    # Test search for Manchester United vs Arsenal match
    query = "Manchester United vs Arsenal match tomorrow"
    print(f"Searching for: {query}")

    try:
        results = await web_search_service.search(query, max_results=3)

        if "error" in results:
            print(f"Error: {results['error']}")
            return False

        print(f"Found {results['total_results']} results:")
        print("-" * 50)

        for i, result in enumerate(results["results"], 1):
            print(f"{i}. {result['title']}")
            print(f"   {result['snippet']}")
            print(f"   URL: {result['url']}")
            print()

        return True

    except Exception as e:
        print(f"Test failed with error: {e}")
        return False


if __name__ == "__main__":
    # Check if SERPAPI_API_KEY is set
    if not os.getenv("SERPAPI_API_KEY"):
        print("Error: SERPAPI_API_KEY environment variable not set")
        print("Please set your SerpAPI API key:")
        print("export SERPAPI_API_KEY='your_api_key_here'")
        sys.exit(1)

    success = asyncio.run(test_web_search())
    if success:
        print("✅ Web search test completed successfully!")
    else:
        print("❌ Web search test failed!")
        sys.exit(1)

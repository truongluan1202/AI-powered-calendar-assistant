"""Web search service using SerpAPI."""

import asyncio
from typing import Dict, Any, List, Optional
from serpapi import GoogleSearch
from app.core.config import settings


class WebSearchService:
    """Service for performing web searches using SerpAPI."""

    def __init__(self):
        self.api_key = settings.SERPAPI_API_KEY

    async def search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Perform a web search using SerpAPI.

        Args:
            query: The search query
            max_results: Maximum number of results to return

        Returns:
            Dictionary containing search results
        """
        if not self.api_key:
            return {"error": "SerpAPI API key not configured", "results": []}

        try:
            # Run the search in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, self._perform_search, query, max_results
            )
            return results
        except Exception as e:
            return {"error": f"Search failed: {str(e)}", "results": []}

    def _perform_search(self, query: str, max_results: int) -> Dict[str, Any]:
        """Perform the actual search using SerpAPI (synchronous)."""
        try:
            search_params = {
                "q": query,
                "api_key": self.api_key,
                "num": max_results,
                "engine": "google",
                "gl": "au",  # Australia
                "hl": "en",  # English
            }

            search = GoogleSearch(search_params)
            results = search.get_dict()

            # Extract organic results
            organic_results = results.get("organic_results", [])

            # Format results for our use case
            formatted_results = []
            for result in organic_results[:max_results]:
                formatted_results.append(
                    {
                        "title": result.get("title", ""),
                        "snippet": result.get("snippet", ""),
                        "url": result.get("link", ""),
                        "position": result.get("position", 0),
                    }
                )

            return {
                "query": query,
                "total_results": len(formatted_results),
                "results": formatted_results,
                "search_metadata": {
                    "search_time": results.get("search_metadata", {}).get(
                        "total_time_taken", 0
                    ),
                    "status": results.get("search_metadata", {}).get(
                        "status", "unknown"
                    ),
                },
            }

        except Exception as e:
            raise Exception(f"SerpAPI search error: {str(e)}")


# Global instance
web_search_service = WebSearchService()

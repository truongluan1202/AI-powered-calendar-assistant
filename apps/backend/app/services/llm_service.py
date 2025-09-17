"""Simplified LLM service focused on Gemini provider."""

import json
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.services.web_search import web_search_service
from app.services.gemini_provider import GeminiProvider, LLMMessage, LLMResponse
from app.services.system_prompts import get_calendar_system_prompt


class LLMService:
    """Simplified LLM service using only Gemini provider."""

    def __init__(self):
        # Initialize with default model, but will be overridden per request
        self.api_key = settings.GEMINI_API_KEY

    def is_provider_available(self, provider: str) -> bool:
        """Check if a provider is available."""
        return provider == "gemini" and bool(settings.GEMINI_API_KEY)

    async def generate_response(
        self,
        provider: str,
        messages: List[LLMMessage],
        model: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        """Generate response using the specified provider."""
        if not self.is_provider_available(provider):
            raise Exception(f"Provider {provider} is not available")

        # Use the provided model or default to gemini-2.5-flash
        model_to_use = model or "gemini-2.5-flash"

        print(f"🔍 DEBUG: Using Gemini model: {model_to_use}")

        # Create a new provider instance with the specified model
        provider_instance = GeminiProvider(api_key=self.api_key, model=model_to_use)

        # Use the unified system prompt for all calendar operations
        system_prompt = get_calendar_system_prompt()

        # Add system message at the beginning
        messages_with_system = [LLMMessage("system", system_prompt)] + messages

        return await provider_instance.generate_response(messages_with_system, tools)

    async def execute_tool_call(self, tool_call: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool call and return the result."""
        try:
            tool_name = tool_call["function"]["name"]
            args = json.loads(tool_call["function"]["arguments"])

            if tool_name == "webSearch":
                # Execute web search directly
                query = args.get("query", "")
                max_results = args.get("maxResults", 5)

                result = await web_search_service.search(query, max_results)
                formatted_content = f"Web search results for '{query}':\n\n"

                if result.get("error"):
                    formatted_content += f"Error: {result['error']}\n"
                else:
                    for i, search_result in enumerate(result.get("results", []), 1):
                        formatted_content += (
                            f"{i}. **{search_result.get('title', 'No title')}**\n"
                        )
                        formatted_content += (
                            f"   {search_result.get('snippet', 'No description')}\n"
                        )
                        formatted_content += (
                            f"   {search_result.get('url', 'No URL')}\n\n"
                        )

                return {
                    "tool_call_id": tool_call["id"],
                    "content": formatted_content,
                    "success": True,
                }
            else:
                # For other tools (getEvents), don't execute them
                # They should be handled by the frontend
                raise NotImplementedError(
                    f"Tool '{tool_name}' not implemented in backend"
                )

        except Exception as e:
            return {
                "tool_call_id": tool_call["id"],
                "content": "",
                "success": False,
                "error": f"Tool execution failed: {str(e)}",
            }

    def is_web_search_query(self, user_message: str) -> bool:
        """Detect if a user message is a web search request."""
        return user_message.startswith("🔍 Web Search:")

    def is_calendar_query(self, user_message: str) -> bool:
        """Detect if a user message is calendar-related."""
        calendar_keywords = [
            "calendar",
            "event",
            "meeting",
            "appointment",
            "schedule",
            "book",
            "create",
            "add",
            "tomorrow",
            "today",
            "next week",
            "this week",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            "am",
            "pm",
            "morning",
            "afternoon",
            "evening",
            "night",
            "confirm",
            "modify",
            "edit",
            "delete",
            "remove",
            "show",
            "list",
            "what",
            "when",
            "where",
            "who",
        ]

        user_message_lower = user_message.lower()
        return any(keyword in user_message_lower for keyword in calendar_keywords)

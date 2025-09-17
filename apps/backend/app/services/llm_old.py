"""LLM service for routing requests to different providers."""

import asyncio
import json
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from enum import Enum

from openai import AsyncOpenAI
import anthropic
import google.genai as genai

from app.core.config import settings
from app.services.web_search import web_search_service


# ----------------------------
# Provider enum
# ----------------------------
class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


# ----------------------------
# Message / Response wrappers
# ----------------------------
class LLMMessage:
    """Message structure for LLM requests."""

    def __init__(
        self, role: str, content: str, tool_calls: Optional[List[Dict[str, Any]]] = None
    ):
        self.role = role
        self.content = content
        self.tool_calls = tool_calls


class LLMResponse:
    """Response structure from LLM providers."""

    def __init__(
        self,
        content: str,
        provider: str,
        model: str,
        usage: Optional[Dict[str, Any]] = None,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
    ):
        self.content = content
        self.provider = provider
        self.model = model
        self.usage = usage or {}
        self.tool_calls = tool_calls or []


# ----------------------------
# Base class
# ----------------------------
class BaseLLMProvider(ABC):
    """Base class for LLM providers."""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def generate_response(
        self, messages: List[LLMMessage], tools: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        raise NotImplementedError


# ----------------------------
# OpenAI
# ----------------------------
class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider implementation."""

    def __init__(self, api_key: str, model: str = "gpt-4"):
        super().__init__(api_key, model)
        self.client = AsyncOpenAI(api_key=api_key)

    async def generate_response(
        self, messages: List[LLMMessage], tools: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        try:
            openai_messages = []
            for m in messages:
                msg = {"role": m.role, "content": m.content}
                if m.tool_calls:
                    msg["tool_calls"] = m.tool_calls
                openai_messages.append(msg)

            # Prepare the request parameters
            request_params = {
                "model": self.model,
                "messages": openai_messages,
                "max_tokens": 1000,
                "temperature": 0.7,
            }

            # Add tools if provided
            if tools:
                request_params["tools"] = tools
                request_params["tool_choice"] = "auto"

            response = await self.client.chat.completions.create(**request_params)

            message = response.choices[0].message
            content = message.content or ""

            # Extract tool calls if present
            tool_calls = []
            if hasattr(message, "tool_calls") and message.tool_calls:
                for tool_call in message.tool_calls:
                    tool_calls.append(
                        {
                            "id": tool_call.id,
                            "type": tool_call.type,
                            "function": {
                                "name": tool_call.function.name,
                                "arguments": tool_call.function.arguments,
                            },
                        }
                    )

            usage = {}
            if getattr(response, "usage", None):
                usage = {
                    "prompt_tokens": getattr(response.usage, "prompt_tokens", None),
                    "completion_tokens": getattr(
                        response.usage, "completion_tokens", None
                    ),
                    "total_tokens": getattr(response.usage, "total_tokens", None),
                }

            return LLMResponse(
                content, LLMProvider.OPENAI, self.model, usage, tool_calls
            )
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")


# ----------------------------
# Anthropic (Claude)
# ----------------------------
class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider implementation."""

    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        super().__init__(api_key, model)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate_response(
        self, messages: List[LLMMessage], tools: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        try:
            system_message = None
            anthropic_messages = []
            for m in messages:
                if m.role == "system":
                    system_message = m.content
                elif m.role in ("user", "assistant", "tool"):
                    msg = {"role": m.role, "content": m.content}
                    if m.tool_calls:
                        msg["tool_calls"] = m.tool_calls
                    anthropic_messages.append(msg)

            # Prepare request parameters
            request_params = {
                "model": self.model,
                "max_tokens": 1000,
                "temperature": 0.7,
                "system": system_message,
                "messages": anthropic_messages,
            }

            # Add tools if provided (Anthropic format)
            if tools:
                request_params["tools"] = tools

            resp = await self.client.messages.create(**request_params)

            content = resp.content[0].text if getattr(resp, "content", None) else ""

            # Extract tool calls if present (Anthropic format)
            tool_calls = []
            if hasattr(resp, "content") and resp.content:
                for content_item in resp.content:
                    if (
                        hasattr(content_item, "type")
                        and content_item.type == "tool_use"
                    ):
                        tool_calls.append(
                            {
                                "id": content_item.id,
                                "type": "tool_use",
                                "function": {
                                    "name": content_item.name,
                                    "arguments": content_item.input,
                                },
                            }
                        )

            usage = {}
            if getattr(resp, "usage", None):
                usage = {
                    "input_tokens": getattr(resp.usage, "input_tokens", None),
                    "output_tokens": getattr(resp.usage, "output_tokens", None),
                }

            return LLMResponse(
                content, LLMProvider.ANTHROPIC, self.model, usage, tool_calls
            )
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")


# ----------------------------
# Gemini (Google Gen AI SDK)
# ----------------------------
class GeminiProvider(BaseLLMProvider):
    """
    Gemini provider using the Google Gen AI SDK.
    Suggested models:
      - gemini-2.5-flash-lite (default here)
      - gemini-2.0-flash-lite
      - gemini-2.5-flash
      - gemini-2.0-flash
    """

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash-lite"):
        super().__init__(api_key, model)
        self.client = genai.Client(api_key=api_key)
        self.model = model

    async def generate_response(
        self, messages: List[LLMMessage], tools: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        try:
            # Convert messages to Gemini format
            prompt_parts = []

            for msg in messages:
                if msg.role == "system":
                    prompt_parts.append(f"System: {msg.content}")
                elif msg.role == "user":
                    prompt_parts.append(f"User: {msg.content}")
                elif msg.role == "assistant":
                    if msg.tool_calls:
                        prompt_parts.append(
                            f"Assistant: {msg.content} [Tool calls: {msg.tool_calls}]"
                        )
                    else:
                        prompt_parts.append(f"Assistant: {msg.content}")
                elif msg.role == "tool":
                    prompt_parts.append(f"Tool: {msg.content}")

            prompt = "\n\n".join(prompt_parts)

            # Prepare generation config
            config = genai.types.GenerateContentConfig(
                max_output_tokens=1000,
                temperature=0.7,
            )

            # Add tools if provided (already formatted for Gemini in tools.py)
            if tools:
                config.tools = [{"function_declarations": tools}]
            # Use the google-genai client to generate content (synchronous call)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
                ),
            )

            content = (
                response.text if hasattr(response, "text") and response.text else ""
            )

            # Extract tool calls if present (Gemini format)
            tool_calls = []
            if hasattr(response, "candidates") and response.candidates:
                for candidate in response.candidates:
                    if (
                        hasattr(candidate, "content")
                        and candidate.content
                        and hasattr(candidate.content, "parts")
                        and candidate.content.parts
                    ):
                        for part in candidate.content.parts:
                            if (
                                hasattr(part, "function_call")
                                and part.function_call is not None
                            ):
                                json_args = json.dumps(part.function_call.args)
                                tool_calls.append(
                                    {
                                        "id": f"gemini-{hash(part.function_call.name)}",
                                        "type": "function",
                                        "function": {
                                            "name": part.function_call.name,
                                            "arguments": json_args,
                                        },
                                    }
                                )

            return LLMResponse(
                content=content,
                provider=LLMProvider.GEMINI,
                model=self.model,
                usage={},  # Gemini doesn't provide detailed usage info
                tool_calls=tool_calls,
            )
        except Exception as e:
            error_str = str(e)
            # Handle specific Gemini API errors with user-friendly messages
            if "503" in error_str and "overloaded" in error_str.lower():
                raise Exception(
                    "Our AI model is currently overloaded and experiencing high demand. Please try again in a few moments. We apologize for the inconvenience!"
                )
            elif "503" in error_str:
                raise Exception(
                    "The AI service is temporarily unavailable. Please try again in a few moments."
                )
            elif "429" in error_str:
                raise Exception(
                    "Too many requests. Please wait a moment before trying again."
                )
            elif "401" in error_str or "403" in error_str:
                raise Exception(
                    "Authentication error. Please refresh the page and try again."
                )
            else:
                raise Exception(f"Gemini API error: {error_str}")


# ----------------------------
# LLM Service (router)
# ----------------------------
class LLMService:
    """Service for managing LLM providers and routing requests."""

    def __init__(self):
        self.providers: Dict[str, BaseLLMProvider] = {}
        self._initialize_providers()

    def _initialize_providers(self):
        if getattr(settings, "OPENAI_API_KEY", None):
            self.providers[LLMProvider.OPENAI] = OpenAIProvider(
                settings.OPENAI_API_KEY,
                model=getattr(settings, "OPENAI_MODEL", "gpt-4"),
            )

        if getattr(settings, "ANTHROPIC_API_KEY", None):
            self.providers[LLMProvider.ANTHROPIC] = AnthropicProvider(
                settings.ANTHROPIC_API_KEY,
                model=getattr(settings, "ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),
            )

        if getattr(settings, "GEMINI_API_KEY", None):
            self.providers[LLMProvider.GEMINI] = GeminiProvider(
                settings.GEMINI_API_KEY,
                model=getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash-lite"),
            )

    def get_available_providers(self) -> List[str]:
        return list(self.providers.keys())

    def is_provider_available(self, provider: str) -> bool:
        return provider in self.providers

    async def generate_response(
        self,
        provider: str,
        messages: List[LLMMessage],
        model: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} is not available")

        if model and model != self.providers[provider].model:
            if provider == LLMProvider.OPENAI:
                temp = OpenAIProvider(settings.OPENAI_API_KEY, model)
            elif provider == LLMProvider.ANTHROPIC:
                temp = AnthropicProvider(settings.ANTHROPIC_API_KEY, model)
            elif provider == LLMProvider.GEMINI:
                temp = GeminiProvider(settings.GEMINI_API_KEY, model)
            else:
                raise ValueError(f"Unknown provider: {provider}")
            return await temp.generate_response(messages, tools)

        return await self.providers[provider].generate_response(messages, tools)

    async def generate_chat_response(
        self,
        provider: str,
        user_message: str,
        conversation_history: List[LLMMessage],
        model: Optional[str] = None,
    ) -> LLMResponse:
        from datetime import datetime
        import pytz

        # Get current time in Australian timezone for consistency with frontend
        aus_tz = pytz.timezone("Australia/Sydney")
        current_time = datetime.now(aus_tz)
        current_time_str = current_time.strftime("%Y-%m-%dT%H:%M:%S%z")

        system_message = LLMMessage(
            role="system",
            content=(
                "CRITICAL: When showing event confirmation details, NEVER use '---', '📅 Event Details:', or 'Please confirm:' text. Use ONLY the format: **Title:**, **Date & Time:**, **Location:**, **Description:**, **Attendees:**\n\n"
                "You are an AI calendar assistant. Help users manage their schedules, "
                "create events, and answer questions about their calendar. "
                "You have access to tools to get calendar events, create new events, and search the web. "
                "\n\n"
                f"Current time: {current_time_str} (Australia/Sydney timezone).\n"
                f"For any calendar question, use this current time to interpret 'today', 'tomorrow', 'this week', 'this month', etc.\n\n"
                "IMPORTANT: You MUST use tools to answer calendar-related questions. Do not try to answer "
                "calendar questions without using the appropriate tools. Here are the key rules:\n"
                "- For ANY question about existing events, upcoming events, or calendar queries, ALWAYS use getEvents tool\n"
                "- For creating new events, NEVER use createEvent tool directly - ALWAYS use handleEventConfirmation tool\n"
                "- For general information not related to the user's calendar, use webSearch tool\n"
                "- ALWAYS use the current time above when creating events or interpreting time references\n"
                "\n"
                "WEB SEARCH AND EVENT CREATION FLOW:\n"
                "When a user performs a web search (indicated by '🔍 Web Search:' prefix), follow this process:\n"
                "1. Present the search results clearly and informatively\n"
                "2. If the search results contain information that could be used to create a calendar event (like sports matches, concerts, conferences, etc.), ask the user if they want to create an event based on that information\n"
                "3. If the user responds with ANY positive answer (yes, yes please, sure, ok, create it, etc.), ALWAYS show the confirmation format with event details\n"
                "4. NEVER create an event directly - ALWAYS require explicit confirmation via the confirmation format\n"
                "5. Wait for user to type 'confirm' or 'cancel' before proceeding\n"
                "\n"
                "EVENT CREATION CONFIRMATION PROCESS:\n"
                "When a user wants to create an event (either directly or after web search), follow this process:\n"
                "1. First, present the event details clearly in a confirmation format (DO NOT call createEvent tool yet)\n"
                "2. Present the event details for confirmation\n"
                "3. ONLY when user responds with 'confirm', use handleEventConfirmation tool:\n"
                "   - If 'confirm': use handleEventConfirmation with action='confirm' and eventDetails\n"
                "   - If 'cancel': use handleEventConfirmation with action='cancel'\n"
                "   - If 'modify [details]': use handleEventConfirmation with action='modify' and modifications\n"
                "   - If 'modify the event with these details: {...}': use handleEventConfirmation with action='modify' and the provided eventDetails\n"
                "4. The handleEventConfirmation tool will handle the actual event creation or cancellation\n"
                "5. NEVER call createEvent tool directly - always use handleEventConfirmation tool\n"
                "\n"
                "CONFIRMATION FORMAT:\n"
                "When asking for confirmation, use this EXACT format (do NOT include '---', '📅 Event Details:', or 'Please confirm:' text):\n"
                "**Title:** [Event Title]\n"
                "**Date & Time:** [Start Time] - [End Time]\n"
                "**Location:** [Location if specified]\n"
                "**Description:** [Description if specified]\n"
                "**Attendees:** [Attendees if specified]\n"
                "\n"
                "Examples of when to use getEvents tool:\n"
                "- 'What's on my calendar tomorrow?' → getEvents with timeMin=tomorrow, timeMax=day after tomorrow\n"
                "- 'What's my next event?' → getEvents with timeMin=now, maxResults=1\n"
                "- 'Do I have any meetings today?' → getEvents with timeMin=today start, timeMax=today end\n"
                "- 'Show me my schedule for next week' → getEvents with timeMin=next week start, timeMax=next week end\n"
                "\n"
                "Examples of web search and event creation flow:\n"
                "- User searches 'Manchester United vs Arsenal match tomorrow' → Show search results, then ask 'Would you like me to create a calendar event for this match?'\n"
                "- User responds 'Yes please' → Show confirmation format with event details, wait for 'confirm'\n"
                "- User searches 'Taylor Swift concert Sydney' → Show search results, then ask 'Would you like me to add this concert to your calendar?'\n"
                "- User responds 'Sure' → Show confirmation format with event details, wait for 'confirm'\n"
                "- User searches 'AI conference next month' → Show search results, then ask 'Would you like me to create an event for this conference?'\n"
                "- User responds 'Yes' → Show confirmation format with event details, wait for 'confirm'\n"
                "\n"
                "Examples of event creation confirmation:\n"
                "- 'Add a meeting with John tomorrow at 2pm' → Show confirmation, wait for user response\n"
                "- 'Schedule a dentist appointment' → Show confirmation with reasonable defaults, wait for user response\n"
                "- User responds 'confirm' → Use handleEventConfirmation tool with action='confirm'\n"
                "- User responds 'cancel' → Use handleEventConfirmation tool with action='cancel'\n"
                "- User responds 'modify time to 3pm' → Use handleEventConfirmation tool with action='modify'\n"
                "\n"
                "Be helpful, concise, and professional. Always confirm actions you take."
            ),
        )

        messages = (
            [system_message] + conversation_history + [LLMMessage("user", user_message)]
        )

        # Define the available tools
        tools = [
            {
                "name": "getEvents",
                "description": "Get events from Google Calendar",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "timeMin": {
                            "type": "string",
                            "description": "Lower bound (exclusive) for an event's end time to filter by",
                        },
                        "timeMax": {
                            "type": "string",
                            "description": "Upper bound (exclusive) for an event's start time to filter by",
                        },
                        "maxResults": {
                            "type": "integer",
                            "description": "Maximum number of events returned on one result page",
                        },
                        "query": {
                            "type": "string",
                            "description": "Free text search terms to find events that match these terms",
                        },
                        "calendarId": {
                            "type": "string",
                            "description": "Calendar identifier. Default is 'primary'",
                        },
                    },
                },
            },
            {
                "name": "handleEventConfirmation",
                "description": "Handle user confirmation for event creation. Use this when user responds with 'confirm', 'cancel', or 'modify [details]' to an event confirmation request.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["confirm", "cancel", "modify"],
                            "description": "The user's confirmation action: 'confirm' to create the event, 'cancel' to abort, or 'modify' to change details",
                        },
                        "eventDetails": {
                            "type": "object",
                            "description": "The event details to create (only needed when action is 'confirm')",
                            "properties": {
                                "summary": {
                                    "type": "string",
                                    "description": "Title of the event",
                                },
                                "description": {
                                    "type": "string",
                                    "description": "Description of the event",
                                },
                                "start": {
                                    "type": "object",
                                    "properties": {
                                        "dateTime": {
                                            "type": "string",
                                            "description": "Event start time in RFC3339 format",
                                        },
                                        "timeZone": {
                                            "type": "string",
                                            "description": "Time zone of the event",
                                        },
                                    },
                                },
                                "end": {
                                    "type": "object",
                                    "properties": {
                                        "dateTime": {
                                            "type": "string",
                                            "description": "Event end time in RFC3339 format",
                                        },
                                        "timeZone": {
                                            "type": "string",
                                            "description": "Time zone of the event",
                                        },
                                    },
                                },
                                "location": {
                                    "type": "string",
                                    "description": "Geographic location of the event",
                                },
                                "attendees": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "email": {
                                                "type": "string",
                                                "description": "Attendee's email address",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        "modifications": {
                            "type": "string",
                            "description": "Description of modifications requested by user (only needed when action is 'modify')",
                        },
                    },
                    "required": ["action"],
                },
            },
            {
                "name": "webSearch",
                "description": "Search the web for information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"}
                    },
                    "required": ["query"],
                },
            },
        ]

        return await self.generate_response(provider, messages, model, tools)

    def is_calendar_query(self, user_message: str) -> bool:
        """Detect if a user message is calendar-related."""
        calendar_keywords = [
            "calendar",
            "event",
            "meeting",
            "appointment",
            "schedule",
            "agenda",
            "next event",
            "upcoming",
            "today",
            "tomorrow",
            "this week",
            "next week",
            "add event",
            "create event",
            "schedule",
            "book",
            "plan",
            "arrange",
            "what's on",
            "do i have",
            "am i free",
            "busy",
            "available",
        ]

        message_lower = user_message.lower()
        return any(keyword in message_lower for keyword in calendar_keywords)

    def is_web_search_query(self, user_message: str) -> bool:
        """Detect if a user message is a web search request."""
        return user_message.startswith("🔍 Web Search:")

    async def execute_tool_call(self, tool_call: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool call and return the result."""
        try:
            tool_name = tool_call["function"]["name"]
            args = json.loads(tool_call["function"]["arguments"])

            if tool_name == "webSearch":
                # Execute web search directly
                query = args.get("query", "")
                max_results = args.get("maxResults", 5)

                search_results = await web_search_service.search(query, max_results)

                if "error" in search_results:
                    return {
                        "tool_call_id": tool_call["id"],
                        "content": f"Web search failed: {search_results['error']}",
                        "success": False,
                        "error": search_results["error"],
                    }

                # Format results for the LLM
                formatted_content = f"Web search results for '{query}':\n\n"
                for i, result in enumerate(search_results["results"], 1):
                    formatted_content += f"{i}. **{result['title']}**\n"
                    formatted_content += f"   {result['snippet']}\n"
                    formatted_content += f"   URL: {result['url']}\n\n"

                return {
                    "tool_call_id": tool_call["id"],
                    "content": formatted_content,
                    "success": True,
                }
            else:
                # For other tools (getEvents, handleEventConfirmation), don't execute them
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

    async def generate_calendar_response(
        self,
        provider: str,
        user_message: str,
        conversation_history: List[LLMMessage],
        model: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        """Generate response specifically for calendar-related queries with enhanced tool calling guidance."""
        from datetime import datetime
        import pytz

        # Get current time in Australian timezone for consistency with frontend
        aus_tz = pytz.timezone("Australia/Sydney")
        current_time = datetime.now(aus_tz)
        current_time_str = current_time.strftime("%Y-%m-%dT%H:%M:%S%z")

        system_message = LLMMessage(
            role="system",
            content=(
                "CRITICAL: When showing event confirmation details, NEVER use '---', '📅 Event Details:', or 'Please confirm:' text. Use ONLY the format: **Title:**, **Date & Time:**, **Location:**, **Description:**, **Attendees:**\n\n"
                "You are an AI calendar assistant. Your primary function is to help users with their calendar.\n"
                "Keep the tone polite and professional. Ask for more help after finishing a task. Always be helpful and concise. Behave accordingly to the user's tone and context, especially if they are angry or rude.\n\n"
                "You MUST use tools to answer calendar questions - never try to answer without tools.\n\n"
                f"Current time: {current_time_str} (Australia/Sydney timezone).\n"
                f"For any calendar question, use this current time to interpret 'today', 'tomorrow', 'this week', 'this month', etc.\n\n"
                "CRITICAL RULES:\n"
                "1. For ANY question about existing events, upcoming events, or calendar queries, you MUST use getEvents tool\n"
                "2. For creating new events, NEVER use createEvent tool directly - ALWAYS use handleEventConfirmation tool\n"
                "3. For general information not related to the user's calendar, use webSearch tool\n"
                "4. Never say 'I don't have access to your calendar' - you DO have access via tools\n"
                "5. ALWAYS use the current time above when creating events or interpreting time references\n\n"
                "WEB SEARCH AND EVENT CREATION FLOW:\n"
                "When a user performs a web search (indicated by '🔍 Web Search:' prefix), follow this process:\n"
                "1. Present the search results clearly and informatively\n"
                "2. If the search results contain information that could be used to create a calendar event (like sports matches, concerts, conferences, etc.), ask the user if they want to create an event based on that information\n"
                "3. If the user responds with ANY positive answer (yes, yes please, sure, ok, create it, etc.), ALWAYS show the confirmation format with event details\n"
                "4. NEVER create an event directly - ALWAYS require explicit confirmation via the confirmation format\n"
                "5. Wait for user to type 'confirm' or 'cancel' before proceeding\n\n"
                "EVENT CREATION CONFIRMATION PROCESS:\n"
                "When a user wants to create an event (either directly or after web search), follow this process:\n"
                "1. First, present the event details clearly in a confirmation format (DO NOT call createEvent tool yet)\n"
                "2. Present the event details for confirmation\n"
                "3. ONLY when user responds with 'confirm', use handleEventConfirmation tool:\n"
                "   - If 'confirm': use handleEventConfirmation with action='confirm' and eventDetails\n"
                "   - If 'cancel': use handleEventConfirmation with action='cancel'\n"
                "   - If 'modify [details]': use handleEventConfirmation with action='modify' and modifications\n"
                "   - If 'modify the event with these details:' followed by formatted details: use handleEventConfirmation with action='modify' and parse the formatted details into eventDetails\n"
                "4. The handleEventConfirmation tool will handle the actual event creation or cancellation\n"
                "5. NEVER call createEvent tool directly - always use handleEventConfirmation tool\n\n"
                "EVENT EDIT CONFIRMATION PROCESS:\n"
                "When a user says they just updated an event and provides the updated details, follow this process:\n"
                "1. Acknowledge that the event has been successfully updated\n"
                "2. Present the provided updated event details in the confirmation format\n"
                "3. Show the confirmation form with the updated details they provided\n"
                "4. Do NOT call any tools - the event has already been updated\n"
                "5. Simply display the provided details in the proper format\n"
                "6. Use this format for edit confirmations:\n"
                "   **Title:** [Updated Event Title]\n"
                "   **Date & Time:** [Updated Start Time] - [Updated End Time]\n"
                "   **Location:** [Updated Location if specified]\n"
                "   **Description:** [Updated Description if specified]\n"
                "   **Attendees:** [Updated Attendees if specified]\n"
                "7. Do NOT add any other text to the confirmation form - simply display the provided details in the proper format\n\n"
                "CONFIRMATION FORMAT:\n"
                "When asking for confirmation, use this EXACT format (do NOT include '---', '📅 Event Details:', or 'Please confirm:' text):\n"
                "**Title:** [Event Title]\n"
                "**Date & Time:** [Start Time] - [End Time]\n"
                "**Location:** [Location if specified]\n"
                "**Description:** [Description if specified]\n"
                "**Attendees:** [Attendees if specified]\n\n"
                "HANDLING VAGUE REQUESTS - AUTO-COMPLETE WITH REASONABLE DEFAULTS:\n"
                "When users make vague requests, intelligently fill in missing details:\n\n"
                "• Missing title/summary: Use 'Meeting with [person]' or 'Meeting'\n"
                "• Missing duration: Assume 1 hour duration (end time = start time + 1 hour)\n"
                "• Missing description: Leave empty or add 'Scheduled via AI assistant'\n"
                "• Missing location: Leave empty\n"
                "• Missing attendees: Leave empty\n\n"
                "SPECIFIC EXAMPLES:\n"
                "User: 'What's my next event?'\n"
                "→ Use getEvents with timeMin=now, maxResults=1\n\n"
                "User: 'What's on my calendar tomorrow?'\n"
                "→ Use getEvents with timeMin=tomorrow start, timeMax=tomorrow end\n\n"
                "User: 'Do I have any meetings today?'\n"
                "→ Use getEvents with timeMin=today start, timeMax=today end\n\n"
                "User: 'Add a meeting with John tomorrow at 2pm'\n"
                "→ Show confirmation with event details, wait for user response\n\n"
                "EXAMPLES OF WEB SEARCH AND EVENT CREATION FLOW:\n"
                "User searches 'Manchester United vs Arsenal match tomorrow' → Show search results, then ask 'Would you like me to create a calendar event for this match?'\n"
                "User responds 'Yes please' → Show confirmation format with event details, wait for 'confirm'\n"
                "User searches 'Taylor Swift concert Sydney' → Show search results, then ask 'Would you like me to add this concert to your calendar?'\n"
                "User responds 'Sure' → Show confirmation format with event details, wait for 'confirm'\n"
                "User searches 'AI conference next month' → Show search results, then ask 'Would you like me to create an event for this conference?'\n"
                "User responds 'Yes' → Show confirmation format with event details, wait for 'confirm'\n\n"
                "EXAMPLES OF VAGUE REQUESTS WITH CONFIRMATION:\n"
                "User: 'add a meeting with andy tomorrow at 3pm'\n"
                "→ Show confirmation with summary='Meeting with Andy', start='tomorrow 3pm', end='tomorrow 4pm', wait for user response\n\n"
                "User: 'schedule something with sarah next week'\n"
                "→ Show confirmation with summary='Meeting with Sarah', start='next week monday 9am', end='next week monday 10am', wait for user response\n\n"
                "User: 'book time with the team tomorrow'\n"
                "→ Show confirmation with summary='Team Meeting', start='tomorrow 10am', end='tomorrow 11am', wait for user response\n\n"
                "CONFIRMATION RESPONSES:\n"
                "- User responds 'confirm' → Use handleEventConfirmation tool with action='confirm'\n"
                "- User responds 'cancel' → Use handleEventConfirmation tool with action='cancel'\n"
                "- User responds 'modify time to 3pm' → Use handleEventConfirmation tool with action='modify'\n\n"
                "When creating events, use relative time references like 'tomorrow 2pm' and let the system convert them to proper timestamps.\n"
                "Always use the appropriate tool first, then provide a helpful response based on the tool results."
            ),
        )

        messages = (
            [system_message] + conversation_history + [LLMMessage("user", user_message)]
        )
        return await self.generate_response(provider, messages, model, tools)

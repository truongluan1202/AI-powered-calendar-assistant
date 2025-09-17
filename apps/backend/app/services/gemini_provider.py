"""Gemini provider implementation using Google Gen AI SDK."""

import json
import asyncio
from typing import List, Optional, Dict, Any
import google.genai as genai

from app.core.config import settings


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


class GeminiProvider:
    """
    Gemini provider using the Google Gen AI SDK.
    """

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.client = genai.Client(api_key=api_key)

    async def generate_response(
        self, messages: List[LLMMessage], tools: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        """Generate response using Gemini."""
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
                thinking_config=genai.types.ThinkingConfig(thinking_budget=0),
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
                provider="gemini",
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

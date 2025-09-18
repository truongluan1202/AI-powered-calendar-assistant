"""Gemini provider implementation using Google Gen AI SDK."""

import json
import asyncio
import warnings
from typing import List, Optional, Dict, Any
import google.genai as genai

from app.core.config import settings

# Suppress warnings from Google Gen AI SDK about non-text parts
warnings.filterwarnings("ignore", message=".*non-text parts.*", category=UserWarning)


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
                temperature=0.6,
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

            # Extract content and tool calls manually to avoid warnings
            content = ""
            tool_calls = []

            print(f"🔍 DEBUG: Response type: {type(response)}")
            print(f"🔍 DEBUG: Response attributes: {dir(response)}")

            if hasattr(response, "candidates") and response.candidates:
                print(f"🔍 DEBUG: Number of candidates: {len(response.candidates)}")
                for i, candidate in enumerate(response.candidates):
                    print(f"🔍 DEBUG: Candidate {i} type: {type(candidate)}")
                    print(f"🔍 DEBUG: Candidate {i} attributes: {dir(candidate)}")

                    if (
                        hasattr(candidate, "content")
                        and candidate.content
                        and hasattr(candidate.content, "parts")
                        and candidate.content.parts
                    ):
                        print(
                            f"🔍 DEBUG: Candidate {i} has {len(candidate.content.parts)} parts"
                        )
                        for j, part in enumerate(candidate.content.parts):
                            print(f"🔍 DEBUG: Part {j} type: {type(part)}")
                            print(f"🔍 DEBUG: Part {j} attributes: {dir(part)}")

                            # Extract text content only
                            if hasattr(part, "text") and part.text:
                                content += part.text
                                print(
                                    f"🔍 DEBUG: Added text content: '{part.text[:100]}...'"
                                )
                            # Extract function calls
                            elif (
                                hasattr(part, "function_call")
                                and part.function_call is not None
                            ):
                                json_args = json.dumps(part.function_call.args)
                                tool_call = {
                                    "id": f"gemini-{hash(part.function_call.name)}",
                                    "type": "function",
                                    "function": {
                                        "name": part.function_call.name,
                                        "arguments": json_args,
                                    },
                                }
                                tool_calls.append(tool_call)
                                print(
                                    f"🔍 DEBUG: Added function call: {part.function_call.name} with args: {json_args}"
                                )
                            # Skip any other non-text parts to avoid warnings
                            else:
                                print(
                                    f"🔍 DEBUG: Skipping part {j} - neither text nor function_call"
                                )
                                pass
                    else:
                        print(f"🔍 DEBUG: Candidate {i} has no content or parts")
            else:
                print(f"🔍 DEBUG: No candidates in response")

            print(f"🔍 DEBUG: Final content: '{content[:200]}...'")
            print(f"🔍 DEBUG: Final tool_calls: {tool_calls}")
            print(f"🔍 DEBUG: Number of tool calls: {len(tool_calls)}")

            response_obj = LLMResponse(
                content=content,
                provider="gemini",
                model=self.model,
                usage={},  # Gemini doesn't provide detailed usage info
                tool_calls=tool_calls,
            )

            print(f"🔍 DEBUG: LLMResponse created: {response_obj}")
            return response_obj
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

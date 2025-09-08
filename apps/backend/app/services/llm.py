"""LLM service for routing requests to different providers."""

import asyncio
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from enum import Enum

import httpx
from openai import AsyncOpenAI
import anthropic
import google.genai as genai

from app.core.config import settings


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

    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content


class LLMResponse:
    """Response structure from LLM providers."""

    def __init__(
        self,
        content: str,
        provider: str,
        model: str,
        usage: Optional[Dict[str, Any]] = None,
    ):
        self.content = content
        self.provider = provider
        self.model = model
        self.usage = usage or {}


# ----------------------------
# Base class
# ----------------------------
class BaseLLMProvider(ABC):
    """Base class for LLM providers."""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def generate_response(self, messages: List[LLMMessage]) -> LLMResponse:
        raise NotImplementedError


# ----------------------------
# OpenAI
# ----------------------------
class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider implementation."""

    def __init__(self, api_key: str, model: str = "gpt-4"):
        super().__init__(api_key, model)
        self.client = AsyncOpenAI(api_key=api_key)

    async def generate_response(self, messages: List[LLMMessage]) -> LLMResponse:
        try:
            openai_messages = [{"role": m.role, "content": m.content} for m in messages]

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=openai_messages,
                max_tokens=1000,
                temperature=0.7,
            )

            content = (
                (response.choices[0].message.content or "") if response.choices else ""
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

            return LLMResponse(content, LLMProvider.OPENAI, self.model, usage)
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

    async def generate_response(self, messages: List[LLMMessage]) -> LLMResponse:
        try:
            system_message = None
            anthropic_messages = []
            for m in messages:
                if m.role == "system":
                    system_message = m.content
                elif m.role in ("user", "assistant"):
                    anthropic_messages.append({"role": m.role, "content": m.content})

            resp = await self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0.7,
                system=system_message,
                messages=anthropic_messages,
            )

            content = resp.content[0].text if getattr(resp, "content", None) else ""
            usage = {}
            if getattr(resp, "usage", None):
                usage = {
                    "input_tokens": getattr(resp.usage, "input_tokens", None),
                    "output_tokens": getattr(resp.usage, "output_tokens", None),
                }

            return LLMResponse(content, LLMProvider.ANTHROPIC, self.model, usage)
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

    async def generate_response(self, messages: List[LLMMessage]) -> LLMResponse:
        try:
            # Convert messages to Gemini format
            prompt_parts = []

            for msg in messages:
                if msg.role == "system":
                    prompt_parts.append(f"System: {msg.content}")
                elif msg.role == "user":
                    prompt_parts.append(f"User: {msg.content}")
                elif msg.role == "assistant":
                    prompt_parts.append(f"Assistant: {msg.content}")

            prompt = "\n\n".join(prompt_parts)

            # Use the google-genai client to generate content (synchronous call)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=genai.types.GenerateContentConfig(
                        max_output_tokens=1000,
                        temperature=0.7,
                    ),
                ),
            )

            content = (
                response.text if hasattr(response, "text") and response.text else ""
            )

            return LLMResponse(
                content=content,
                provider=LLMProvider.GEMINI,
                model=self.model,
                usage={},  # Gemini doesn't provide detailed usage info
            )
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")


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
            return await temp.generate_response(messages)

        return await self.providers[provider].generate_response(messages)

    async def generate_chat_response(
        self,
        provider: str,
        user_message: str,
        conversation_history: List[LLMMessage],
        model: Optional[str] = None,
    ) -> LLMResponse:
        system_message = LLMMessage(
            role="system",
            content=(
                "You are an AI calendar assistant. Help users manage their schedules, "
                "create events, and answer questions about their calendar. "
                "Be helpful, concise, and professional."
            ),
        )

        messages = (
            [system_message] + conversation_history + [LLMMessage("user", user_message)]
        )
        return await self.generate_response(provider, messages, model)

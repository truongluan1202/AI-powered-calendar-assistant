"""Chat endpoints - Pure LLM service without database operations."""

import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.llm_service import LLMService
from app.services.gemini_provider import LLMMessage
from app.services.tools import get_tools_for_provider


def clean_confirmation_format(content: str) -> str:
    """Clean up any remaining old confirmation format elements from the content."""
    # Remove the old format elements
    content = re.sub(r"^---\s*\n?", "", content, flags=re.MULTILINE)
    content = re.sub(r"\n?---\s*$", "", content, flags=re.MULTILINE)
    content = re.sub(r"📅\s*\*\*Event Details:\*\*\s*\n?", "", content)
    content = re.sub(
        r"Please confirm: Type \'confirm\' to create, \'cancel\' to abort, or \'modify \[details\]\' to change something\.\s*\n?",
        "",
        content,
    )

    # Clean up any extra whitespace
    content = re.sub(r"\n\s*\n\s*\n+", "\n\n", content)
    content = content.strip()

    return content


router = APIRouter()

# Initialize LLM service
llm_service = LLMService()


class Message(BaseModel):
    """Message structure for LLM requests."""

    role: str
    content: str


class GenerateRequest(BaseModel):
    """Request structure for LLM generation."""

    messages: List[Message]
    model_provider: str
    model_name: str


class GenerateResponse(BaseModel):
    """Response structure from LLM generation."""

    content: str
    provider: str
    model: str
    usage: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


@router.post("/generate", response_model=GenerateResponse)
async def generate_llm_response(request: GenerateRequest):
    """Generate LLM response without any database operations."""
    try:

        # Convert messages to LLM format
        llm_messages = [
            LLMMessage(role=msg.role, content=msg.content) for msg in request.messages
        ]

        # Check if provider is available
        if not llm_service.is_provider_available(request.model_provider):
            raise HTTPException(
                status_code=400,
                detail=f"LLM provider {request.model_provider} is not available",
            )

        # Get tools for the provider
        tools = get_tools_for_provider(request.model_provider)

        # Use unified response generation for all queries
        llm_response = await llm_service.generate_response(
            provider=request.model_provider,
            messages=llm_messages,
            model=request.model_name,
            tools=tools,
        )

        # Handle webSearch tool calls internally, others by frontend
        if llm_response.tool_calls:
            web_search_calls = [
                call
                for call in llm_response.tool_calls
                if call["function"]["name"] == "webSearch"
            ]
            other_calls = [
                call
                for call in llm_response.tool_calls
                if call["function"]["name"] != "webSearch"
            ]

            if web_search_calls:
                # Handle webSearch tool calls internally
                tool_results = []
                updated_messages = llm_messages.copy()

                # Add the assistant's response with tool calls
                updated_messages.append(
                    LLMMessage(
                        role="assistant",
                        content=llm_response.content,
                        tool_calls=llm_response.tool_calls,
                    )
                )

                # Execute webSearch tool calls
                for tool_call in web_search_calls:
                    try:
                        result = await llm_service.execute_tool_call(tool_call)
                        tool_results.append(result)
                    except NotImplementedError:
                        # Tool not implemented in backend, skip it
                        pass

                # Add tool results to conversation
                updated_messages.append(
                    LLMMessage(role="tool", content=json.dumps(tool_results))
                )

                # Generate final response with tool results
                final_response = await llm_service.generate_response(
                    provider=request.model_provider,
                    messages=updated_messages,
                    model=request.model_name,
                    tools=tools,
                )

                # Ensure we never return empty content
                content = (
                    final_response.content.strip() if final_response.content else ""
                )
                if not content:
                    content = "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!"

                # Clean up any remaining old confirmation format elements
                content = clean_confirmation_format(content)

                return GenerateResponse(
                    content=content,
                    provider=final_response.provider,
                    model=final_response.model,
                    usage=final_response.usage,
                    tool_calls=final_response.tool_calls,
                )
            else:
                # Only non-webSearch tool calls, return them for frontend handling
                # Ensure we never return empty content
                content = llm_response.content.strip() if llm_response.content else ""
                if not content:
                    content = "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!"

                # Clean up any remaining old confirmation format elements
                content = clean_confirmation_format(content)

                return GenerateResponse(
                    content=content,
                    provider=llm_response.provider,
                    model=llm_response.model,
                    usage=llm_response.usage,
                    tool_calls=other_calls,
                )

        # Ensure we never return empty content
        content = llm_response.content.strip() if llm_response.content else ""
        if not content:
            content = "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!"

        # Clean up any remaining old confirmation format elements
        content = clean_confirmation_format(content)

        return GenerateResponse(
            content=content,
            provider=llm_response.provider,
            model=llm_response.model,
            usage=llm_response.usage,
            tool_calls=llm_response.tool_calls,
        )

    except Exception as e:
        import traceback

        # Log the full error for debugging
        traceback.print_exc()

        # Convert technical errors to user-friendly messages
        error_message = str(e).lower()

        if (
            "api key" in error_message
            or "authentication" in error_message
            or "401" in error_message
            or "403" in error_message
        ):
            user_friendly_message = "I'm having trouble connecting to the AI service. Please check if the service is properly configured and try again."
        elif "503" in error_message and "overloaded" in error_message:
            user_friendly_message = "Our AI model is currently experiencing high demand. Please wait a moment and try again."
        elif "503" in error_message:
            user_friendly_message = "The AI service is temporarily unavailable. Please try again in a few moments."
        elif "429" in error_message or "rate limit" in error_message:
            user_friendly_message = (
                "Too many requests. Please wait a moment before trying again."
            )
        elif "timeout" in error_message or "timed out" in error_message:
            user_friendly_message = (
                "The request took too long to process. Please try again."
            )
        elif "network" in error_message or "connection" in error_message:
            user_friendly_message = "Network connection failed. Please check your internet connection and try again."
        elif "gemini" in error_message and "api" in error_message:
            user_friendly_message = "I'm having trouble connecting to the AI service. Please try again in a moment."
        else:
            user_friendly_message = "I encountered an unexpected error. Please try again, and if the problem persists, please contact support."

        # Return a 200 response with the user-friendly error message instead of raising an exception
        return GenerateResponse(
            content=user_friendly_message,
            provider="gemini",
            model="gemini-2.5-flash",
            usage={},
            tool_calls=[],
        )


@router.get("/providers")
async def get_available_providers():
    """Get list of available LLM providers."""
    return {
        "available_providers": ["gemini"],
        "providers": {
            "gemini": {
                "available": llm_service.is_provider_available("gemini"),
                "models": [
                    "gemini-2.5-flash-lite",
                    "gemini-2.0-flash-lite",
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                ],
            },
        },
    }

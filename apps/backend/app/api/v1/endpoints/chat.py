"""Chat endpoints - Pure LLM service without database operations."""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.llm import LLMService, LLMMessage
from app.services.tools import get_tools_for_provider

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

        # Check if this is a calendar-related query and use appropriate method
        user_message = llm_messages[-1].content if llm_messages else ""
        if llm_service.is_calendar_query(user_message):
            # Use calendar-specific response generation for better tool calling
            conversation_history = llm_messages[:-1] if len(llm_messages) > 1 else []
            llm_response = await llm_service.generate_calendar_response(
                provider=request.model_provider,
                user_message=user_message,
                conversation_history=conversation_history,
                model=request.model_name,
                tools=tools,
            )
        else:
            # Use standard response generation
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

                return GenerateResponse(
                    content=final_response.content,
                    provider=final_response.provider,
                    model=final_response.model,
                    usage=final_response.usage,
                    tool_calls=final_response.tool_calls,
                )
            else:
                # Only non-webSearch tool calls, return them for frontend handling
                return GenerateResponse(
                    content=llm_response.content,
                    provider=llm_response.provider,
                    model=llm_response.model,
                    usage=llm_response.usage,
                    tool_calls=other_calls,
                )

        return GenerateResponse(
            content=llm_response.content,
            provider=llm_response.provider,
            model=llm_response.model,
            usage=llm_response.usage,
            tool_calls=llm_response.tool_calls,
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to generate LLM response: {str(e)}"
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

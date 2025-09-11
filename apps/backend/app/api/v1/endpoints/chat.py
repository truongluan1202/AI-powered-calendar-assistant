"""Chat endpoints - Pure LLM service without database operations."""

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
        print(f"DEBUG: Received request with {len(request.messages)} messages")
        print(f"DEBUG: Provider: {request.model_provider}, Model: {request.model_name}")

        # Convert messages to LLM format
        llm_messages = [
            LLMMessage(role=msg.role, content=msg.content) for msg in request.messages
        ]

        # Check if provider is available
        if not llm_service.is_provider_available(request.model_provider):
            print(f"DEBUG: Provider {request.model_provider} is not available")
            raise HTTPException(
                status_code=400,
                detail=f"LLM provider {request.model_provider} is not available",
            )

        print(f"DEBUG: Calling LLM service with {len(llm_messages)} messages")

        # Get tools for the provider
        tools = get_tools_for_provider(request.model_provider)

        # Check if this is a calendar-related query and use appropriate method
        user_message = llm_messages[-1].content if llm_messages else ""
        if llm_service.is_calendar_query(user_message):
            print(f"DEBUG: This is a calendar-related query")
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

        print(f"DEBUG: LLM response generated successfully")
        print(f"DEBUG: Tool calls: {llm_response.tool_calls}")

        return GenerateResponse(
            content=llm_response.content,
            provider=llm_response.provider,
            model=llm_response.model,
            usage=llm_response.usage,
            tool_calls=llm_response.tool_calls,
        )

    except Exception as e:
        print(f"DEBUG: Error in generate_llm_response: {str(e)}")
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

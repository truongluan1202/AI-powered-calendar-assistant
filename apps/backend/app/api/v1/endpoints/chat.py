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
        r"Please confirm: Type \'confirm\' to create or \'modify \[details\]\' to change something\.\s*\n?",
        "",
        content,
    )

    # Clean up any extra whitespace
    content = re.sub(r"\n\s*\n\s*\n+", "\n\n", content)
    content = content.strip()

    return content


def get_context_aware_response(tool_calls):
    """Generate context-aware responses based on tool calls to match frontend optimistic messages."""
    print(f"🔍 DEBUG: Getting context-aware response for tool calls: {tool_calls}")

    if not tool_calls:
        print("🔍 DEBUG: No tool calls, using default fallback")
        return "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!"

    # Check for handleEventConfirmation tool calls
    for tool_call in tool_calls:
        if tool_call.get("function", {}).get("name") == "handleEventConfirmation":
            try:
                args = json.loads(tool_call.get("function", {}).get("arguments", "{}"))
                action = args.get("action", "")
                event_details = args.get("eventDetails", {})
                print(f"🔍 DEBUG: Found handleEventConfirmation with action: {action}")

                if action == "confirm":
                    # Extract event title for more personalized response
                    event_title = (
                        event_details.get("summary", "your event")
                        if event_details
                        else "your event"
                    )
                    print(
                        f"🔍 DEBUG: Returning personalized confirm response for: {event_title}"
                    )
                    return f"{event_title} has been created successfully! Is there anything else I can help you with?"
                elif action == "modify":
                    # Extract event title for more personalized response
                    event_title = (
                        event_details.get("summary", "your event")
                        if event_details
                        else "your event"
                    )
                    print(
                        f"🔍 DEBUG: Returning personalized modify response for: {event_title}"
                    )
                    return f"{event_title} has been updated successfully! Is there anything else I can help you with?"
            except (json.JSONDecodeError, KeyError) as e:
                print(f"🔍 DEBUG: Error parsing handleEventConfirmation args: {e}")
                # Fallback to generic response
                return "Event operation completed successfully! Is there anything else I can help you with?"

    # Check for getEvents tool calls
    for tool_call in tool_calls:
        if tool_call.get("function", {}).get("name") == "getEvents":
            print("🔍 DEBUG: Found getEvents, returning 'Here are your events:'")
            return "📅 Here are your events:"

    # Check for webSearch tool calls
    for tool_call in tool_calls:
        if tool_call.get("function", {}).get("name") == "webSearch":
            try:
                args = json.loads(tool_call.get("function", {}).get("arguments", "{}"))
                query = args.get("query", "")
                print(f"🔍 DEBUG: Found webSearch for query: {query}")
                return f"🔍 I found information about '{query}'. Let me know if you'd like to create an event based on this!"
            except (json.JSONDecodeError, KeyError) as e:
                print(f"🔍 DEBUG: Error parsing webSearch args: {e}")
                return "🔍 I found some information for you. Let me know if you'd like to create an event based on this!"

    # Note: createEvent tool is not available - all event creation goes through handleEventConfirmation

    # Check for updateEvent tool calls (if any)
    for tool_call in tool_calls:
        if tool_call.get("function", {}).get("name") == "updateEvent":
            print("🔍 DEBUG: Found updateEvent, returning update response")
            return "Event updated successfully! Is there anything else I can help you with?"

    # Check for deleteEvent tool calls (if any)
    for tool_call in tool_calls:
        if tool_call.get("function", {}).get("name") == "deleteEvent":
            print("🔍 DEBUG: Found deleteEvent, returning deletion response")
            return "Event deleted successfully! Is there anything else I can help you with?"

    # Default fallback
    print("🔍 DEBUG: No matching tool calls, using default fallback")
    return "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!"


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

        # Check if this is a request with tool results from frontend
        has_tool_results = any(msg.role == "tool" for msg in llm_messages)

        if has_tool_results:
            # Extract tool results to check for confirmation cards
            tool_message = next(msg for msg in llm_messages if msg.role == "tool")
            try:
                tool_results = json.loads(tool_message.content)
                print(f"🔍 DEBUG: Processing tool results: {tool_results}")

                # Look for handleEventConfirmation results with confirmation card content
                for result in tool_results:
                    if result.get("success") and result.get("content"):
                        content = result.get("content", "")
                        # Check if this looks like a confirmation card
                        if "**Title:**" in content and "**Date & Time:**" in content:
                            print(f"🔍 DEBUG: Found confirmation card in tool results")
                            return GenerateResponse(
                                content=content,
                                provider="gemini",
                                model=request.model_name,
                                usage={},
                                tool_calls=None,
                            )
            except (json.JSONDecodeError, KeyError, StopIteration) as e:
                print(f"🔍 DEBUG: Error processing tool results: {e}")
                # Continue with normal processing

        # Use unified response generation for all queries
        llm_response = await llm_service.generate_response(
            provider=request.model_provider,
            messages=llm_messages,
            model=request.model_name,
            tools=tools,
        )

        print("🔍 DEBUG: LLM Response received:")
        print(f"🔍 DEBUG: - Content: '{llm_response.content[:200]}...'")
        print(f"🔍 DEBUG: - Provider: {llm_response.provider}")
        print(f"🔍 DEBUG: - Model: {llm_response.model}")
        print(f"🔍 DEBUG: - Tool calls: {llm_response.tool_calls}")
        print(f"🔍 DEBUG: - Number of tool calls: {len(llm_response.tool_calls)}")

        # Handle webSearch tool calls internally, others by frontend
        if llm_response.tool_calls:
            web_search_calls = [
                call
                for call in llm_response.tool_calls
                if call["function"]["name"] == "webSearch"
            ]

            if web_search_calls:
                # Execute webSearch tool calls and generate response in one step
                tool_results = []
                for tool_call in web_search_calls:
                    try:
                        result = await llm_service.execute_tool_call(tool_call)
                        tool_results.append(result)
                    except NotImplementedError:
                        pass

                # Build updated messages efficiently
                updated_messages = llm_messages + [
                    LLMMessage(
                        role="assistant",
                        content=llm_response.content,
                        tool_calls=llm_response.tool_calls,
                    ),
                    LLMMessage(role="tool", content=json.dumps(tool_results)),
                ]

                # Generate final response
                final_response = await llm_service.generate_response(
                    provider=request.model_provider,
                    messages=updated_messages,
                    model=request.model_name,
                    tools=tools,
                )

                # Ensure content exists
                content = (
                    final_response.content.strip()
                    if final_response.content
                    else get_context_aware_response(llm_response.tool_calls)
                )
                content = clean_confirmation_format(content)

                final_response_obj = GenerateResponse(
                    content=content,
                    provider=final_response.provider,
                    model=final_response.model,
                    usage=final_response.usage,
                    tool_calls=llm_response.tool_calls,  # Include original tool calls for frontend optimistic messaging
                )

                print("🔍 DEBUG: Final response (with web search):")
                print(f"🔍 DEBUG: - Content: '{final_response_obj.content[:200]}...'")
                print(f"🔍 DEBUG: - Tool calls: {final_response_obj.tool_calls}")

                return final_response_obj
            else:
                # Only non-webSearch tool calls, return them for frontend handling
                other_calls = [
                    call
                    for call in llm_response.tool_calls
                    if call["function"]["name"] != "webSearch"
                ]
                # Ensure we never return empty content
                content = llm_response.content.strip() if llm_response.content else ""
                if not content:
                    # Only use context-aware response if there are tool calls that would trigger optimistic messages
                    if llm_response.tool_calls and any(
                        call.get("function", {}).get("name")
                        in [
                            "handleEventConfirmation",
                            "getEvents",
                            "createEvent",
                            "updateEvent",
                            "deleteEvent",
                        ]
                        for call in llm_response.tool_calls
                    ):
                        print(
                            "🔍 DEBUG: Empty content with tool calls, using context-aware fallback"
                        )
                        content = get_context_aware_response(llm_response.tool_calls)
                    else:
                        print(
                            "🔍 DEBUG: Empty content without relevant tool calls, using generic fallback"
                        )
                        content = "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!"

                # Clean up any remaining old confirmation format elements
                content = clean_confirmation_format(content)

                final_response_obj = GenerateResponse(
                    content=content,
                    provider=llm_response.provider,
                    model=llm_response.model,
                    usage=llm_response.usage,
                    tool_calls=other_calls,
                )

                print("🔍 DEBUG: Final response (no web search):")
                print(f"🔍 DEBUG: - Content: '{final_response_obj.content[:200]}...'")
                print(f"🔍 DEBUG: - Tool calls: {final_response_obj.tool_calls}")

                return final_response_obj

        # Ensure we never return empty content
        content = llm_response.content.strip() if llm_response.content else ""
        if not content:
            # Only use context-aware response if there are tool calls that would trigger optimistic messages
            if llm_response.tool_calls and any(
                call.get("function", {}).get("name")
                in [
                    "handleEventConfirmation",
                    "getEvents",
                    "createEvent",
                    "updateEvent",
                    "deleteEvent",
                ]
                for call in llm_response.tool_calls
            ):
                print(
                    "🔍 DEBUG: Empty content with tool calls, using context-aware fallback"
                )
                content = get_context_aware_response(llm_response.tool_calls)
            else:
                print(
                    "🔍 DEBUG: Empty content without relevant tool calls, using generic fallback"
                )
                content = "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!"

        # Clean up any remaining old confirmation format elements
        content = clean_confirmation_format(content)

        final_response_obj = GenerateResponse(
            content=content,
            provider=llm_response.provider,
            model=llm_response.model,
            usage=llm_response.usage,
            tool_calls=llm_response.tool_calls,
        )

        print("🔍 DEBUG: Final response (no tool calls):")
        print(f"🔍 DEBUG: - Content: '{final_response_obj.content[:200]}...'")
        print(f"🔍 DEBUG: - Tool calls: {final_response_obj.tool_calls}")

        return final_response_obj

    except Exception as e:
        import traceback

        # Log the full error for debugging
        traceback.print_exc()

        # The Gemini provider already converts errors to user-friendly messages
        # So we can use the error message directly
        error_message = str(e)
        print(f"🔍 DEBUG: Error message: {error_message}")

        # If the error message already looks user-friendly, use it directly
        if any(
            phrase in error_message.lower()
            for phrase in [
                "currently overloaded",
                "temporarily unavailable",
                "too many requests",
                "authentication error",
                "please try again",
                "please wait",
            ]
        ):
            user_friendly_message = error_message
        else:
            # Fallback for unexpected errors
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

"""Tool definitions for the AI Calendar Assistant."""

from typing import Dict, Any, List
from pydantic import BaseModel, Field


class ToolCall(BaseModel):
    """Represents a tool call from the LLM."""

    name: str = Field(..., description="The name of the tool to call")
    arguments: Dict[str, Any] = Field(..., description="Arguments for the tool call")
    id: str = Field(..., description="Unique identifier for this tool call")


class ToolResult(BaseModel):
    """Represents the result of a tool call."""

    tool_call_id: str = Field(..., description="ID of the tool call this result is for")
    content: str = Field(..., description="The result content from the tool")
    success: bool = Field(..., description="Whether the tool call was successful")
    error: str = Field(default="", description="Error message if the call failed")


# Tool definitions for the LLM
CALENDAR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "getEvents",
            "description": "Get calendar events for a specific time period or search for specific events. Use this tool for ANY question about existing events, upcoming events, or calendar queries. Examples: 'What's my next event?', 'What's on my calendar tomorrow?', 'Do I have meetings today?', 'Show me my schedule for next week'",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeMin": {
                        "type": "string",
                        "description": "Lower bound (exclusive) for an event's end time to filter by. RFC3339 timestamp with mandatory time zone offset, e.g., 2011-06-03T10:00:00-07:00",
                    },
                    "timeMax": {
                        "type": "string",
                        "description": "Upper bound (exclusive) for an event's start time to filter by. RFC3339 timestamp with mandatory time zone offset, e.g., 2011-06-03T10:00:00-07:00",
                    },
                    "query": {
                        "type": "string",
                        "description": "Free text search terms to find events that match these terms in any field, except for extended properties",
                    },
                    "calendarId": {
                        "type": "string",
                        "description": "Calendar identifier. Default is 'primary'",
                        "default": "primary",
                    },
                    "maxResults": {
                        "type": "integer",
                        "description": "Maximum number of events returned on one result page",
                        "default": 10,
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "webSearch",
            "description": "Search the web for information when calendar data is not sufficient",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "maxResults": {
                        "type": "integer",
                        "description": "Maximum number of results to return",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "handleEventConfirmation",
            "description": "Handle user confirmation for event creation. Use this when user responds with 'confirm' or 'modify [details]' to an event confirmation request.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["confirm", "modify"],
                        "description": "The user's confirmation action: 'confirm' to create the event, or 'modify' to change details",
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
                                "required": ["dateTime"],
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
                                "required": ["dateTime"],
                            },
                            "location": {
                                "type": "string",
                                "description": "Geographic location of the event",
                            },
                        },
                        "required": ["summary", "start", "end"],
                    },
                    "modifications": {
                        "type": "string",
                        "description": "Details of what the user wants to modify (only needed when action is 'modify')",
                    },
                },
                "required": ["action"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "updateEvent",
            "description": "Update an existing calendar event. Use this when the user wants to modify details of an existing event like changing the time, title, description, or location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "eventId": {
                        "type": "string",
                        "description": "The ID of the event to update",
                    },
                    "calendarId": {
                        "type": "string",
                        "description": "Calendar identifier. Default is 'primary'",
                        "default": "primary",
                    },
                    "summary": {
                        "type": "string",
                        "description": "Updated title of the event",
                    },
                    "description": {
                        "type": "string",
                        "description": "Updated description of the event",
                    },
                    "start": {
                        "type": "object",
                        "properties": {
                            "dateTime": {
                                "type": "string",
                                "description": "Updated event start time in RFC3339 format",
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
                                "description": "Updated event end time in RFC3339 format",
                            },
                            "timeZone": {
                                "type": "string",
                                "description": "Time zone of the event",
                            },
                        },
                    },
                    "location": {
                        "type": "string",
                        "description": "Updated location of the event",
                    },
                },
                "required": ["eventId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "deleteEvent",
            "description": "Delete an existing calendar event. Use this when the user wants to remove an event from their calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "eventId": {
                        "type": "string",
                        "description": "The ID of the event to delete",
                    },
                    "calendarId": {
                        "type": "string",
                        "description": "Calendar identifier. Default is 'primary'",
                        "default": "primary",
                    },
                },
                "required": ["eventId"],
            },
        },
    },
]


def get_tools_for_provider(provider: str) -> List[Dict[str, Any]]:
    """Get the appropriate tools format for the given provider."""
    if provider == "openai":
        return CALENDAR_TOOLS
    elif provider == "anthropic":
        # Anthropic uses a different format
        return [
            {
                "name": tool["function"]["name"],
                "description": tool["function"]["description"],
                "input_schema": tool["function"]["parameters"],
            }
            for tool in CALENDAR_TOOLS
        ]
    elif provider == "gemini":
        # Gemini uses function declarations
        return [
            {
                "name": tool["function"]["name"],
                "description": tool["function"]["description"],
                "parameters": tool["function"]["parameters"],
            }
            for tool in CALENDAR_TOOLS
        ]
    else:
        return CALENDAR_TOOLS

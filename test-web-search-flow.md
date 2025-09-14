# Test: Web Search Flow Fix

## Issue

After implementing the web search button, the AI was not asking if the user wants to create an event based on search results.

## Root Cause

The web search was directly calling the tool execution endpoint instead of going through the LLM system that has the updated prompts.

## Solution

Modified the `performWebSearch` function in the frontend to use the LLM system instead of directly calling the web search tool.

### Changes Made

**Frontend (`apps/frontend/src/app/chat/page.tsx`):**

- Changed `performWebSearch` to use `generateAIResponseMutation.mutate()` instead of direct tool execution
- This ensures the web search goes through the LLM system with proper prompts
- Removed direct tool execution and error handling (now handled by LLM system)

**Backend (`apps/backend/app/services/llm.py`):**

- Added `is_web_search_query()` method to detect web search messages
- Updated system prompts to handle web search flow properly
- Web search tool is already included in the tools list

## Expected Flow Now

1. **User clicks Search button** with query "Manchester United vs Arsenal match tomorrow"
2. **Frontend sends** `🔍 Web Search: Manchester United vs Arsenal match tomorrow` to LLM
3. **LLM detects** web search message and uses webSearch tool
4. **LLM receives** search results and applies the updated prompt
5. **LLM responds** with search results + "Would you like me to create a calendar event for this match?"
6. **User responds** with "Yes" or "No"
7. **If Yes**, LLM shows confirmation form
8. **User confirms**, LLM creates event

## Test Commands

Try these searches with the Search button:

```
"Manchester United vs Arsenal match tomorrow"
"Taylor Swift concert Sydney"
"AI conference next month"
"Weather forecast for Sydney"
```

## Expected AI Responses

**After Search:**

```
I found information about [search topic]. Here are the details:

[Search results...]

Would you like me to create a calendar event for this?
```

**After User Says Yes:**

```
Based on the search results, I can create an event with these details:

---
📅 **Event Details:**
**Title:** [Event Title]
**Date & Time:** [Start Time] - [End Time]
**Location:** [Location if available]
**Description:** [Description from search results]
---
Please confirm: Type 'confirm' to create, 'cancel' to abort, or 'modify [details]' to change something.
```

## Verification

- [ ] Search button triggers LLM system
- [ ] LLM uses webSearch tool automatically
- [ ] AI asks about event creation after search
- [ ] User can decline event creation
- [ ] User can accept event creation
- [ ] Event confirmation form works
- [ ] Event creation only happens after confirmation

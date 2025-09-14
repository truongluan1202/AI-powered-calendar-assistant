# Test: Creating Event with Web Search for Manchester United vs Arsenal

This document demonstrates how to use the web search functionality to create a calendar event with details about the Manchester United vs Arsenal match.

## Setup

1. **Set up environment variables:**

   ```bash
   export SERPAPI_API_KEY="your_serpapi_key_here"
   export NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
   ```

2. **Install backend dependencies:**

   ```bash
   cd apps/backend
   uv sync
   ```

3. **Start the backend:**

   ```bash
   cd apps/backend
   uvicorn app.main:app --reload --port 8000
   ```

4. **Start the frontend:**
   ```bash
   cd apps/frontend
   pnpm dev
   ```

## Test the Web Search Functionality

### 1. Test Backend Web Search Directly

Run the test script:

```bash
python test-web-search.py
```

Expected output:

```
Testing web search functionality...
Searching for: Manchester United vs Arsenal match tomorrow
Found 3 results:
--------------------------------------------------
1. Manchester United vs Arsenal - Premier League Fixtures
   Manchester United vs Arsenal match details, kick-off time, venue, and more...
   URL: https://www.premierleague.com/...

2. Arsenal vs Manchester United Live Score and Commentary
   Live updates, team news, and match commentary for Arsenal vs Manchester United...
   URL: https://www.bbc.com/sport/...

3. Manchester United vs Arsenal: Head-to-Head Record
   Complete head-to-head record between Manchester United and Arsenal...
   URL: https://www.skysports.com/...
```

### 2. Test Through the Chat Interface

1. Open the frontend application at `http://localhost:3000`
2. Navigate to the chat page
3. Send the message: "Help me create an event with details about the match tomorrow between Manchester United and Arsenal"

Expected behavior:

1. The AI should use the `webSearch` tool to find information about the match
2. Based on the search results, it should extract:
   - Match date and time
   - Venue/location
   - Teams playing
   - Any other relevant details
3. Present a confirmation with event details like:
   ```
   📅 **Event Details:**
   **Title:** Manchester United vs Arsenal - Premier League
   **Date & Time:** [Date and time from search results]
   **Location:** [Venue from search results]
   **Description:** Premier League match between Manchester United and Arsenal
   ---
   Please confirm: Type 'confirm' to create, 'cancel' to abort, or 'modify [details]' to change something.
   ```

### 3. Expected AI Workflow

1. **User Input:** "Help me create an event with details about the match tomorrow between Manchester United and Arsenal"

2. **AI Response:** The AI should:

   - Recognize this requires web search for current information
   - Call the `webSearch` tool with query: "Manchester United vs Arsenal match tomorrow"
   - Process the search results to extract relevant information
   - Present a confirmation with the extracted details

3. **User Confirmation:** User can then:
   - Type "confirm" to create the event
   - Type "cancel" to abort
   - Type "modify [details]" to change something

## Implementation Details

### Backend Changes Made

1. **Added SerpAPI dependency** to `pyproject.toml`
2. **Created web search service** at `app/services/web_search.py`
3. **Added web search tool execution** to `app/api/v1/endpoints/chat.py`
4. **Updated configuration** to include `SERPAPI_API_KEY`

### Frontend Changes Made

1. **Updated tools.ts** to call backend web search endpoint
2. **Added environment variable** for backend URL
3. **Enhanced webSearch method** to handle real web search

### Tool Definition

The `webSearch` tool is already defined in the tools with these parameters:

- `query` (required): The search query string
- `maxResults` (optional): Maximum number of results to return (default: 5)

## Troubleshooting

### Common Issues

1. **SerpAPI API Key not set:**

   - Error: "SerpAPI API key not configured"
   - Solution: Set the `SERPAPI_API_KEY` environment variable

2. **Backend not running:**

   - Error: "Web search failed: 500 Internal Server Error"
   - Solution: Ensure the backend is running on port 8000

3. **CORS issues:**

   - Error: CORS policy blocking requests
   - Solution: Ensure backend CORS is configured to allow frontend requests

4. **No search results:**
   - The search might not find relevant results
   - Try different search queries or check if the match is actually scheduled

## Example Search Queries

For testing, try these search queries:

- "Manchester United vs Arsenal match tomorrow"
- "Arsenal vs Manchester United Premier League fixture"
- "Man United Arsenal match time date"
- "Premier League Arsenal Manchester United schedule"

The web search should return current information about the match, including date, time, venue, and other relevant details that can be used to create a comprehensive calendar event.

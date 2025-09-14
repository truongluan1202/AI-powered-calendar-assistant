# Web Search Setup Guide

This guide explains how to set up and use the web search functionality with SerpAPI for your AI Calendar Assistant.

## Prerequisites

1. **SerpAPI Account**: Sign up at [serpapi.com](https://serpapi.com) and get your API key
2. **Backend and Frontend**: Ensure both are set up and running

## Setup Steps

### 1. Install Backend Dependencies

```bash
cd apps/backend
uv sync
```

This will install the new `google-search-results` package for SerpAPI integration.

### 2. Set Environment Variables

Create a `.env` file in the backend directory or set these environment variables:

```bash
# Backend (.env file)
SERPAPI_API_KEY=your_serpapi_key_here

# Frontend (.env.local file)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 3. Start the Services

**Backend:**

```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd apps/frontend
pnpm dev
```

## Testing the Web Search

### 1. Test Backend Directly

Run the test script:

```bash
python test-web-search.py
```

### 2. Test Through Chat Interface

1. Open `http://localhost:3000/chat`
2. Send: "Help me create an event with details about the match tomorrow between Manchester United and Arsenal"
3. The AI should:
   - Search the web for match information
   - Extract relevant details (date, time, venue)
   - Present a confirmation with event details
   - Allow you to confirm, cancel, or modify the event

## How It Works

1. **User Request**: User asks for help creating an event about a specific topic
2. **Web Search**: AI uses the `webSearch` tool to find current information
3. **Information Extraction**: AI processes search results to extract relevant details
4. **Event Creation**: AI presents a confirmation with extracted details
5. **User Confirmation**: User can confirm, cancel, or modify the event

## Features Added

- **SerpAPI Integration**: Real-time web search using Google Search Results API
- **Smart Information Extraction**: AI extracts relevant details from search results
- **Enhanced Event Creation**: Events can now include current, real-world information
- **Flexible Search**: Supports various search queries for different types of events

## Example Use Cases

- **Sports Events**: "Create an event for the Manchester United vs Arsenal match tomorrow"
- **Conferences**: "Schedule a meeting about the AI conference next week"
- **Concerts**: "Add the Taylor Swift concert to my calendar"
- **Holidays**: "Create an event for Christmas Day"
- **Weather Events**: "Schedule a reminder for the solar eclipse next month"

## Troubleshooting

### Common Issues

1. **"SerpAPI API key not configured"**

   - Solution: Set the `SERPAPI_API_KEY` environment variable

2. **"Web search failed: 500 Internal Server Error"**

   - Solution: Ensure backend is running and dependencies are installed

3. **No search results found**

   - Solution: Try different search queries or check if the information exists online

4. **CORS errors**
   - Solution: Ensure backend CORS is configured to allow frontend requests

### Getting Help

If you encounter issues:

1. Check the backend logs for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Test the backend web search endpoint directly

## API Usage

The web search tool accepts these parameters:

- `query` (required): Search query string
- `maxResults` (optional): Maximum number of results (default: 5)

Example tool call:

```json
{
  "tool_name": "webSearch",
  "arguments": {
    "query": "Manchester United vs Arsenal match tomorrow",
    "maxResults": 3
  }
}
```

This will return formatted search results that the AI can use to create detailed calendar events.

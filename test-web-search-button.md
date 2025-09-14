# Web Search Button Test Guide

This guide demonstrates how to test the new web search button functionality in the AI Calendar Assistant.

## What's New

A new **Web Search** button has been added next to the Send button in the chat interface. This button allows users to perform web searches directly without triggering calendar functions.

## Features

### 🔍 Web Search Button

- **Location**: Next to the Send button in the input area
- **Color**: Blue gradient to distinguish from the Send button
- **Icon**: Search magnifying glass icon
- **Function**: Performs web search using SerpAPI

### 📝 User Experience

- **Input**: Type your search query in the input field
- **Web Search**: Click the blue "Search" button to search the web
- **Send Message**: Click the gray "Send" button for normal AI chat
- **Visual Feedback**: Loading states and disabled states during operations

## How to Test

### 1. Start the Application

**Backend:**

```bash
cd apps/backend
uv sync
export SERPAPI_API_KEY="your_serpapi_key_here"
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd apps/frontend
export NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
pnpm dev
```

### 2. Test Web Search Button

1. **Open the chat interface** at `http://localhost:3000/chat`
2. **Type a search query** in the input field, for example:
   - "Manchester United vs Arsenal match tomorrow"
   - "Weather forecast for Sydney"
   - "Latest AI news"
   - "Python programming tutorials"
3. **Click the blue "Search" button** (not the Send button)
4. **Observe the behavior**:
   - Input field shows "Searching the web..." placeholder
   - Button shows "Searching..." with loading spinner
   - User message appears as "🔍 Web Search: [your query]"
   - AI response shows "Searching the web for information..."
   - Search results are displayed in formatted text

### 3. Test Send Button (Normal Chat)

1. **Type a calendar-related message** in the input field, for example:
   - "What's on my calendar today?"
   - "Create a meeting with John tomorrow at 2pm"
2. **Click the gray "Send" button** (not the Search button)
3. **Observe the behavior**:
   - Normal AI chat functionality
   - Calendar tools are triggered as appropriate

## Expected Behavior

### Web Search Button

- ✅ Performs web search using SerpAPI
- ✅ Shows loading states during search
- ✅ Displays formatted search results
- ✅ Saves search conversation to database
- ✅ Handles errors gracefully

### Send Button

- ✅ Triggers normal AI chat with calendar tools
- ✅ Maintains existing functionality
- ✅ Can create events, get events, etc.

### Input Field

- ✅ Shows appropriate placeholder text based on operation
- ✅ Disables during both web search and normal chat
- ✅ Enter key triggers Send button (not Search button)

## Visual Design

### Web Search Button

- **Color**: Blue gradient (`from-blue-600 to-blue-700`)
- **Hover**: Lighter blue (`from-blue-500 to-blue-600`)
- **Icon**: Magnifying glass search icon
- **Text**: "Search" / "Searching..."

### Send Button

- **Color**: Gray gradient (`from-gray-800 to-gray-900`)
- **Hover**: Lighter gray (`from-gray-700 to-gray-800`)
- **Icon**: Send/paper plane icon
- **Text**: "Send" / "Sending..."

### Help Text

- Small text above input field explains both buttons
- Icons match the respective button icons
- Subtle gray color for guidance

## Error Handling

### Web Search Errors

- **API Key Missing**: Shows "SerpAPI API key not configured"
- **Network Error**: Shows network error message
- **Backend Error**: Shows backend error details
- **No Results**: Shows "No results found" message

### UI State Management

- **Disabled States**: Both buttons disabled during any operation
- **Loading States**: Appropriate loading indicators
- **Error Recovery**: Buttons re-enable after error

## Example Searches

Try these example searches with the Web Search button:

1. **Sports**: "Manchester United vs Arsenal match tomorrow"
2. **Weather**: "Weather forecast for Sydney Australia"
3. **News**: "Latest technology news today"
4. **Events**: "Conferences in Sydney next month"
5. **General**: "How to learn Python programming"
6. **Current Events**: "What's happening in the world today"

## Troubleshooting

### Common Issues

1. **Web Search Button Not Working**

   - Check if `SERPAPI_API_KEY` is set
   - Verify backend is running on port 8000
   - Check browser console for errors

2. **Search Results Not Showing**

   - Verify SerpAPI API key is valid
   - Check backend logs for errors
   - Try different search queries

3. **Buttons Not Responding**
   - Check if input field has text
   - Verify no other operations are in progress
   - Refresh the page if needed

### Debug Steps

1. **Check Environment Variables**:

   ```bash
   echo $SERPAPI_API_KEY
   echo $NEXT_PUBLIC_BACKEND_URL
   ```

2. **Check Backend Logs**:

   - Look for SerpAPI errors
   - Check tool execution logs

3. **Check Frontend Console**:
   - Look for JavaScript errors
   - Check network requests

## Success Criteria

✅ **Web Search Button**:

- Performs web search when clicked
- Shows loading states appropriately
- Displays formatted search results
- Handles errors gracefully

✅ **Send Button**:

- Maintains existing calendar functionality
- Works independently of web search

✅ **User Experience**:

- Clear visual distinction between buttons
- Intuitive operation
- Proper feedback during operations

The web search button provides users with a direct way to search for information without triggering calendar functions, making the assistant more versatile and useful for general information queries.

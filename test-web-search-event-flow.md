# Test: Web Search + Event Creation Flow

This document demonstrates the new web search and event creation flow where the AI asks for confirmation before creating events based on search results.

## New Flow Overview

1. **User performs web search** using the Search button
2. **AI shows search results** clearly and informatively
3. **AI asks if user wants to create an event** based on the search results
4. **User responds** with their preference
5. **If user wants to create event**, AI shows confirmation form
6. **User confirms/modifies/cancels** the event creation

## Test Scenarios

### Scenario 1: Sports Match Search

**Step 1: User searches**

- User types: "Manchester United vs Arsenal match tomorrow"
- User clicks: **Search** button (gray)
- AI shows: Search results about the match

**Step 2: AI asks about event creation**

- AI response: "I found information about the Manchester United vs Arsenal match. Would you like me to create a calendar event for this match?"

**Step 3: User responds**

- User types: "Yes, create an event"
- User clicks: **Send** button (gray)

**Step 4: AI shows confirmation**

- AI shows: Event details in confirmation format
- AI asks: "Please confirm: Type 'confirm' to create, 'cancel' to abort, or 'modify [details]' to change something."

**Step 5: User confirms**

- User types: "confirm"
- User clicks: **Send** button
- AI creates the event

### Scenario 2: Concert Search

**Step 1: User searches**

- User types: "Taylor Swift concert Sydney"
- User clicks: **Search** button
- AI shows: Search results about the concert

**Step 2: AI asks about event creation**

- AI response: "I found information about Taylor Swift's concert in Sydney. Would you like me to add this concert to your calendar?"

**Step 3: User responds**

- User types: "Yes, please add it"
- User clicks: **Send** button

**Step 4: AI shows confirmation**

- AI shows: Concert event details
- AI asks for confirmation

**Step 5: User confirms**

- User types: "confirm"
- AI creates the event

### Scenario 3: Conference Search

**Step 1: User searches**

- User types: "AI conference next month"
- User clicks: **Search** button
- AI shows: Search results about AI conferences

**Step 2: AI asks about event creation**

- AI response: "I found information about AI conferences next month. Would you like me to create an event for any of these conferences?"

**Step 3: User responds**

- User types: "Yes, create an event for the main AI conference"
- User clicks: **Send** button

**Step 4: AI shows confirmation**

- AI shows: Conference event details
- AI asks for confirmation

**Step 5: User confirms**

- User types: "confirm"
- AI creates the event

## Key Features

### 🔍 Web Search Button

- **Purpose**: Search for information without creating events
- **Behavior**: Shows search results and asks if user wants to create event
- **Color**: Gray gradient to match UI theme

### 💬 Send Button

- **Purpose**: Send messages and confirm event creation
- **Behavior**: Handles normal chat and event confirmations
- **Color**: Gray gradient to match UI theme

### 📅 Event Creation Flow

1. **Search results** → AI asks about event creation
2. **User confirms** → AI shows event details
3. **User confirms again** → AI creates the event

## Expected AI Behavior

### When User Searches:

1. ✅ Show search results clearly
2. ✅ Ask if user wants to create an event
3. ✅ Wait for user response
4. ❌ **DO NOT** automatically create events

### When User Wants Event:

1. ✅ Extract details from search results
2. ✅ Show confirmation format
3. ✅ Wait for user confirmation
4. ✅ Create event only after confirmation

### When User Doesn't Want Event:

1. ✅ Acknowledge user's decision
2. ✅ Ask if they need help with anything else
3. ❌ **DO NOT** create any events

## Test Commands

### Web Search Examples:

```
"Manchester United vs Arsenal match tomorrow"
"Taylor Swift concert Sydney"
"AI conference next month"
"Weather forecast for Sydney"
"Latest technology news"
```

### Expected AI Responses:

```
"I found information about [search topic]. Would you like me to create a calendar event for this?"

"Based on the search results, I can create an event with these details:
---
📅 **Event Details:**
**Title:** [Event Title]
**Date & Time:** [Start Time] - [End Time]
**Location:** [Location if available]
**Description:** [Description from search results]
---
Please confirm: Type 'confirm' to create, 'cancel' to abort, or 'modify [details]' to change something."
```

## Benefits of New Flow

1. **User Control**: Users decide whether to create events
2. **Clear Separation**: Search vs. event creation are distinct actions
3. **Better UX**: Users can search without accidentally creating events
4. **Flexibility**: Users can search for information without calendar implications
5. **Confirmation**: All events still require user confirmation

## Testing Checklist

- [ ] Web search shows results without creating events
- [ ] AI asks about event creation after search
- [ ] User can decline event creation
- [ ] User can accept event creation
- [ ] Event confirmation form works properly
- [ ] Event creation only happens after confirmation
- [ ] Both buttons work independently
- [ ] UI maintains consistent gray theme

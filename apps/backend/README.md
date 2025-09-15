# Calendara Backend

The backend service that powers Calendara's AI capabilities.

## What It Does

- **AI Processing**: Handles all AI requests and responses
- **Calendar Integration**: Manages Google Calendar API interactions
- **Web Search**: Provides real-time information when needed
- **Tool Execution**: Runs calendar management tools and actions

## Getting Started

1. **Install dependencies**:

   ```bash
   uv sync
   ```

2. **Set up environment variables**:
   Create a `.env` file with:

   ```
   GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

3. **Start the server**:
   ```bash
   uv run uvicorn main:app --reload --port 8000
   ```

## Features

- **Multi-Provider AI**: Supports multiple AI providers for reliable responses
- **Calendar Tools**: Built-in tools for scheduling and calendar management
- **Web Search**: Real-time information gathering capabilities
- **Secure API**: Safe and secure API endpoints for the frontend

## API Endpoints

- **Health Check**: Monitor service status
- **AI Chat**: Process conversational requests
- **Calendar Tools**: Execute calendar management actions
- **Web Search**: Search for real-time information

## Configuration

The backend automatically detects available AI providers based on your API keys and routes requests accordingly.

## Support

For technical questions or issues, please contact our development team.

## Backend Environment

Create `.env` in `apps/backend` or set environment variables:

```
DATABASE_URL=postgresql+asyncpg://postgres:12345@localhost:5432/postgres

# LLM Provider API Keys (optional - only set the ones you want to use)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## Project Structure

The backend follows a clean architecture pattern:

```
app/
├── core/           # Core configuration and database setup
├── models/         # SQLAlchemy database models
├── repositories/   # Data access layer
├── schemas/        # Pydantic request/response models
├── services/       # Business logic (LLM providers)
├── api/           # API routes and endpoints
└── main.py        # FastAPI application
```

## Database Setup

The backend includes PostgreSQL database integration with SQLAlchemy async support using asyncpg driver.

## LLM Integration

The backend supports multiple LLM providers:

- **OpenAI**: GPT-4, GPT-3.5-turbo, GPT-4-turbo
- **Anthropic**: Claude-3 Sonnet, Haiku, Opus
- **Gemini**: Gemini 2.5 Flash Lite, Gemini 2.0 Flash Lite, Gemini 2.5 Flash, Gemini 2.0 Flash

The system automatically detects available providers based on API keys and routes chat requests accordingly.

### Test Database Connection

Run the test script to verify database connectivity and models:

```bash
uv run python test_db.py
```

### Run Development Server

```bash
uv run uvicorn main:app --reload --port 8000
```

## API Endpoints

### Common Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/echo` - Echo endpoint
- `POST /api/v1/ai/suggest` - AI suggestion endpoint

### Chat Endpoints

- `GET /api/v1/chat/providers` - Get available LLM providers
- `POST /api/v1/chat/thread` - Create a new chat thread
- `GET /api/v1/chat/threads` - Get all chat threads for user
- `GET /api/v1/chat/{thread_id}/messages` - Get all messages for a thread
- `POST /api/v1/chat/{thread_id}/message` - Post a message to a thread

### Example Usage

```bash
# Check available LLM providers
curl http://localhost:8000/api/v1/chat/providers

# Create a chat thread
curl -X POST http://localhost:8000/api/v1/chat/thread \
  -H "Content-Type: application/json" \
  -d '{"title": "My Chat", "model_provider": "openai", "model_name": "gpt-4"}'

# Or with Gemini
curl -X POST http://localhost:8000/api/v1/chat/thread \
  -H "Content-Type: application/json" \
  -d '{"title": "Gemini Chat", "model_provider": "gemini", "model_name": "gemini-2.5-flash-lite"}'

# Post a message
curl -X POST http://localhost:8000/api/v1/chat/{thread_id}/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello! Can you help me schedule a meeting?"}'

# Get messages
curl http://localhost:8000/api/v1/chat/{thread_id}/messages
```

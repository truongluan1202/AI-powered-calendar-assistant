## Backend Environment

Create `.env` in `apps/backend` or set environment variables:

```
# LLM Provider API Keys (optional - only set the ones you want to use)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## Project Structure

The backend follows a stateless architecture pattern:

```
app/
├── core/           # Core configuration
├── schemas/        # Pydantic request/response models
├── services/       # Business logic (LLM providers)
├── api/           # API routes and endpoints
└── main.py        # FastAPI application
```

## Architecture

The backend is now **stateless** and does not maintain its own database. All data persistence is handled by the frontend's Prisma database. The backend focuses solely on:

- **LLM Integration**: Routing requests to different AI providers
- **API Services**: Providing stateless endpoints for the frontend
- **Configuration**: Managing API keys and settings

## LLM Integration

The backend supports multiple LLM providers:

- **OpenAI**: GPT-4, GPT-3.5-turbo, GPT-4-turbo
- **Anthropic**: Claude-3 Sonnet, Haiku, Opus
- **Gemini**: Gemini 2.5 Flash Lite, Gemini 2.0 Flash Lite, Gemini 2.5 Flash, Gemini 2.0 Flash

The system automatically detects available providers based on API keys and routes chat requests accordingly.

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
- `POST /api/v1/chat/generate` - Generate LLM response (stateless)

### Example Usage

```bash
# Check available LLM providers
curl http://localhost:8000/api/v1/chat/providers

# Generate LLM response
curl -X POST http://localhost:8000/api/v1/chat/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! Can you help me schedule a meeting?"}
    ],
    "model_provider": "openai",
    "model_name": "gpt-4"
  }'

# Or with Gemini
curl -X POST http://localhost:8000/api/v1/chat/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the weather like today?"}
    ],
    "model_provider": "gemini",
    "model_name": "gemini-2.5-flash-lite"
  }'
```

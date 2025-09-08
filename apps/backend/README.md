## Backend Environment

Create `.env` in `apps/backend` or set environment variables:

```
DATABASE_URL=postgresql+asyncpg://postgres:12345@localhost:5432/postgres
```

## Project Structure

The backend follows a clean architecture pattern:

```
app/
├── core/           # Core configuration and database setup
├── models/         # SQLAlchemy database models
├── repositories/   # Data access layer
├── schemas/        # Pydantic request/response models
├── api/           # API routes and endpoints
└── main.py        # FastAPI application
```

## Database Setup

The backend includes PostgreSQL database integration with SQLAlchemy async support using asyncpg driver.

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

- `POST /api/v1/chat/session` - Create a new chat session
- `GET /api/v1/chat/{session_id}/messages` - Get all messages for a session
- `POST /api/v1/chat/{session_id}/message` - Post a message to a session

### Example Usage

```bash
# Create a chat session
curl -X POST http://localhost:8000/api/v1/chat/session

# Post a message
curl -X POST http://localhost:8000/api/v1/chat/{session_id}/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello!", "model": "openai"}'

# Get messages
curl http://localhost:8000/api/v1/chat/{session_id}/messages
```

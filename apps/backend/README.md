## Backend env

Create `.env` in `apps/backend` or set environment variables:

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/calendar_ai
```

Run dev server with uvicorn:

```
uvicorn main:app --reload --port 8000
```

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI Calendar Backend (dev)")

# Allow local frontend origins in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EchoIn(BaseModel):
    message: str


class EchoOut(BaseModel):
    echoed: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/echo", response_model=EchoOut)
def echo(body: EchoIn):
    return {"echoed": body.message}


class SuggestIn(BaseModel):
    context: str


class SuggestOut(BaseModel):
    suggestion: str


@app.post("/ai/suggest", response_model=SuggestOut)
def suggest(body: SuggestIn):
    # Stub implementation – later will call AI service
    context_preview = body.context.strip()
    if not context_preview:
        return {
            "suggestion": "No context provided. Try describing your schedule preferences."
        }
    return {
        "suggestion": f"Based on your context: '{context_preview[:60]}', schedule a 25-min focus block at 9:00 AM and a recap at 4:30 PM."
    }

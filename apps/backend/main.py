# main.py  — minimal backend, no database
from __future__ import annotations

import os
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# -------- Config --------
ALLOWED_ORIGINS = ["*"]


app = FastAPI(title="AI Calendar Backend (no-DB)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------- Health / Echo / Suggest --------
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
    ctx = body.context.strip()
    if not ctx:
        return {
            "suggestion": "No context provided. Try describing your schedule preferences."
        }
    return {
        "suggestion": (
            f"Based on your context: '{ctx[:60]}', schedule a 25-min focus block at 9:00 AM "
            f"and a recap at 4:30 PM."
        )
    }


# -------- In-memory chat (ephemeral; resets on restart) --------
class CreateSessionOut(BaseModel):
    session_id: str


class PostMessageIn(BaseModel):
    content: str
    model: Literal["openai", "gemini", "claude"] = "openai"


class Message(BaseModel):
    id: int
    role: str
    content: str


class GetMessagesOut(BaseModel):
    messages: list[Message]


# sessions: {session_id: [Message, ...]}
_SESSIONS: dict[str, list[Message]] = {}
_NEXT_ID: dict[str, int] = {}  # per-session incrementing ids


@app.post("/chat/session", response_model=CreateSessionOut)
def create_chat_session():
    sid = str(uuid4())
    _SESSIONS[sid] = []
    _NEXT_ID[sid] = 1
    return {"session_id": sid}


@app.get("/chat/{session_id}/messages", response_model=GetMessagesOut)
def get_messages(session_id: str):
    if session_id not in _SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    return {"messages": _SESSIONS[session_id]}


@app.post("/chat/{session_id}/message", response_model=Message)
def post_message(session_id: str, body: PostMessageIn):
    if session_id not in _SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")

    # user message
    msg_id = _NEXT_ID[session_id]
    _NEXT_ID[session_id] += 1
    user_msg = Message(id=msg_id, role="user", content=body.content)
    _SESSIONS[session_id].append(user_msg)

    # assistant stub
    msg_id = _NEXT_ID[session_id]
    _NEXT_ID[session_id] += 1
    assistant_text = f"[{body.model}] You said: {body.content}"
    assistant_msg = Message(id=msg_id, role="assistant", content=assistant_text)
    _SESSIONS[session_id].append(assistant_msg)

    return assistant_msg

"""Chat endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.chat import ChatRepository
from app.schemas.chat import (
    CreateSessionResponse,
    PostMessageRequest,
    MessageResponse,
    GetMessagesResponse,
)

router = APIRouter()


@router.post("/session", response_model=CreateSessionResponse)
async def create_chat_session(db: AsyncSession = Depends(get_db)):
    """Create a new chat session."""
    chat_repo = ChatRepository()
    session = await chat_repo.create_session(db)
    return CreateSessionResponse(session_id=session.session_id)


@router.get("/{session_id}/messages", response_model=GetMessagesResponse)
async def get_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get all messages for a chat session."""
    chat_repo = ChatRepository()
    messages = await chat_repo.get_messages(db, session_id)

    return GetMessagesResponse(
        messages=[
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                model=msg.model,
                created_at=msg.created_at,
            )
            for msg in messages
        ]
    )


@router.post("/{session_id}/message", response_model=MessageResponse)
async def post_message(
    session_id: str, body: PostMessageRequest, db: AsyncSession = Depends(get_db)
):
    """Post a message to a chat session."""
    chat_repo = ChatRepository()

    # Add user message
    user_message = await chat_repo.add_message(
        db, session_id, "user", body.content, body.model
    )

    if not user_message:
        raise HTTPException(status_code=404, detail="Session not found")

    # Generate assistant response (stub for now)
    assistant_content = f"[{body.model}] You said: {body.content}"
    assistant_message = await chat_repo.add_message(
        db, session_id, "assistant", assistant_content, body.model
    )

    return MessageResponse(
        id=assistant_message.id,
        role=assistant_message.role,
        content=assistant_message.content,
        model=assistant_message.model,
        created_at=assistant_message.created_at,
    )



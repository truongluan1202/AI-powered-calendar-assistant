"""Chat endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.chat import ChatRepository
from app.services.llm import LLMService, LLMMessage
from app.schemas.chat import (
    CreateThreadRequest,
    CreateThreadResponse,
    PostMessageRequest,
    MessageResponse,
    GetMessagesResponse,
    ThreadResponse,
    GetThreadsResponse,
    UpdateThreadRequest,
    UpdateThreadResponse,
    DeleteThreadResponse,
)

router = APIRouter()

# Initialize LLM service
llm_service = LLMService()


@router.get("/providers")
async def get_available_providers():
    """Get list of available LLM providers."""
    return {
        "available_providers": llm_service.get_available_providers(),
        "providers": {
            "openai": {
                "available": llm_service.is_provider_available("openai"),
                "models": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
            },
            "anthropic": {
                "available": llm_service.is_provider_available("anthropic"),
                "models": [
                    "claude-3-sonnet-20240229",
                    "claude-3-haiku-20240307",
                    "claude-3-opus-20240229",
                ],
            },
            "gemini": {
                "available": llm_service.is_provider_available("gemini"),
                "models": [
                    "gemini-2.5-flash-lite",
                    "gemini-2.0-flash-lite",
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                ],
            },
        },
    }


@router.post("/thread", response_model=CreateThreadResponse)
async def create_chat_thread(
    body: CreateThreadRequest, db: AsyncSession = Depends(get_db)
):
    """Create a new chat thread."""
    # TODO: Get user_id from authentication
    user_id = 1  # Placeholder

    chat_repo = ChatRepository()
    thread = await chat_repo.create_thread(
        db, user_id, body.title, body.model_provider, body.model_name
    )
    return CreateThreadResponse(thread_id=thread.id)


@router.get("/threads", response_model=GetThreadsResponse)
async def get_user_threads(db: AsyncSession = Depends(get_db)):
    """Get all chat threads for the current user."""
    # TODO: Get user_id from authentication
    user_id = 1  # Placeholder

    chat_repo = ChatRepository()
    threads = await chat_repo.get_user_threads(db, user_id)

    return GetThreadsResponse(
        threads=[
            ThreadResponse(
                id=thread.id,
                title=thread.title,
                model_provider=thread.model_provider,
                model_name=thread.model_name,
                created_at=thread.created_at,
                updated_at=thread.updated_at,
            )
            for thread in threads
        ]
    )


@router.get("/{thread_id}/messages", response_model=GetMessagesResponse)
async def get_messages(thread_id: int, db: AsyncSession = Depends(get_db)):
    """Get all messages for a chat thread."""
    chat_repo = ChatRepository()
    messages = await chat_repo.get_messages(db, thread_id)

    return GetMessagesResponse(
        messages=[
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
            )
            for msg in messages
        ]
    )


@router.post("/{thread_id}/message", response_model=MessageResponse)
async def post_message(
    thread_id: int, body: PostMessageRequest, db: AsyncSession = Depends(get_db)
):
    """Post a message to a chat thread."""
    # TODO: Get user_id from authentication
    user_id = 1  # Placeholder

    chat_repo = ChatRepository()

    # Get the thread to check if it exists and get model info
    thread = await chat_repo.get_thread_by_id(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Add user message
    user_message = await chat_repo.add_message(
        db, thread_id, "user", body.content, user_id
    )

    if not user_message:
        raise HTTPException(status_code=500, detail="Failed to save user message")

    try:
        # Get conversation history
        messages = await chat_repo.get_messages(db, thread_id)

        # Convert to LLM message format (exclude the user message we just added)
        conversation_history = [
            LLMMessage(role=msg.role, content=msg.content)
            for msg in messages[
                :-1
            ]  # Exclude the last message (user's current message)
        ]

        # Generate assistant response using LLM service
        if not llm_service.is_provider_available(thread.model_provider):
            raise HTTPException(
                status_code=400,
                detail=f"LLM provider {thread.model_provider} is not available",
            )

        llm_response = await llm_service.generate_chat_response(
            provider=thread.model_provider,
            user_message=body.content,
            conversation_history=conversation_history,
            model=thread.model_name,
        )

        # Add assistant response to database
        assistant_message = await chat_repo.add_message(
            db, thread_id, "assistant", llm_response.content
        )

        if not assistant_message:
            raise HTTPException(
                status_code=500, detail="Failed to save assistant message"
            )

        return MessageResponse(
            id=assistant_message.id,
            role=assistant_message.role,
            content=assistant_message.content,
            created_at=assistant_message.created_at,
        )

    except Exception as e:
        # If LLM generation fails, add a fallback message
        fallback_content = f"I apologize, but I'm having trouble processing your request right now. Error: {str(e)}"
        assistant_message = await chat_repo.add_message(
            db, thread_id, "assistant", fallback_content
        )

        return MessageResponse(
            id=assistant_message.id,
            role=assistant_message.role,
            content=assistant_message.content,
            created_at=assistant_message.created_at,
        )


@router.put("/thread/{thread_id}", response_model=UpdateThreadResponse)
async def update_thread(
    thread_id: int, body: UpdateThreadRequest, db: AsyncSession = Depends(get_db)
):
    """Update a chat thread's title."""
    chat_repo = ChatRepository()

    thread = await chat_repo.update_thread_title(db, thread_id, body.title)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    return UpdateThreadResponse(
        id=thread.id,
        title=thread.title,
        model_provider=thread.model_provider,
        model_name=thread.model_name,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


@router.delete("/thread/{thread_id}", response_model=DeleteThreadResponse)
async def delete_thread(thread_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a chat thread and all its messages."""
    chat_repo = ChatRepository()

    success = await chat_repo.delete_thread(db, thread_id)
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found")

    return DeleteThreadResponse(success=True, message="Thread deleted successfully")

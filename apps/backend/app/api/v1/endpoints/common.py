"""Common endpoints."""

from fastapi import APIRouter

from app.schemas.common import (
    EchoRequest,
    EchoResponse,
    SuggestRequest,
    SuggestResponse,
)

router = APIRouter()


@router.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@router.post("/echo", response_model=EchoResponse)
def echo(body: EchoRequest):
    """Echo endpoint."""
    return EchoResponse(echoed=body.message)


@router.post("/ai/suggest", response_model=SuggestResponse)
def suggest(body: SuggestRequest):
    """AI suggestion endpoint."""
    ctx = body.context.strip()
    if not ctx:
        return SuggestResponse(
            suggestion="No context provided. Try describing your schedule preferences."
        )
    return SuggestResponse(
        suggestion=(
            f"Based on your context: '{ctx[:60]}', schedule a 25-min focus block at 9:00 AM "
            f"and a recap at 4:30 PM."
        )
    )



"""Common schemas."""

from pydantic import BaseModel


class EchoRequest(BaseModel):
    """Echo request schema."""

    message: str


class EchoResponse(BaseModel):
    """Echo response schema."""

    echoed: str


class SuggestRequest(BaseModel):
    """AI suggestion request schema."""

    context: str


class SuggestResponse(BaseModel):
    """AI suggestion response schema."""

    suggestion: str



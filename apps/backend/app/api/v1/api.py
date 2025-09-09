"""API v1 router."""

from fastapi import APIRouter

from app.api.v1.endpoints import chat, common

api_router = APIRouter()

api_router.include_router(common.router, tags=["common"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

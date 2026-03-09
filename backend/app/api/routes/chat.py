"""Chat endpoint placeholder. For future: ask questions about impact data."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Placeholder: echo back. Replace with LLM + RAG over dashboard data later."""
    return ChatResponse(reply=f"Echo: {request.message}")

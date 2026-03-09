"""Engineers list and detail. Placeholder: reads from same file as dashboard."""

from fastapi import APIRouter, HTTPException

from app.models.dashboard import EngineerSummary
from app.services.data_loader import build_dashboard_response, load_engineers_json

router = APIRouter(prefix="/api", tags=["engineers"])


@router.get("/engineers", response_model=list[EngineerSummary])
async def get_engineers() -> list[EngineerSummary]:
    """Top engineers list. Same source as dashboard."""
    return build_dashboard_response().engineers


@router.get("/engineers/{login}", response_model=EngineerSummary)
async def get_engineer(login: str) -> EngineerSummary:
    """Single engineer by login. 404 if not in dataset."""
    raw = load_engineers_json()
    dashboard = build_dashboard_response()
    for e in dashboard.engineers:
        if e.login == login:
            return e
    raise HTTPException(status_code=404, detail=f"Engineer '{login}' not found")

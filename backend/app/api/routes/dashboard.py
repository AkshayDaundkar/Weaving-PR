"""Dashboard aggregate endpoint: top engineers + summary. Single fetch for the page."""

from fastapi import APIRouter

from app.models.dashboard import DashboardResponse
from app.services.data_loader import build_dashboard_response

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard() -> DashboardResponse:
    """Full dashboard payload for the single-page UI. Reads from file/fixture."""
    return build_dashboard_response()

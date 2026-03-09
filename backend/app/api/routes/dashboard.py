"""Dashboard aggregate endpoint: full DashboardData. Single fetch for the page."""

from fastapi import APIRouter, HTTPException

from app.models.dashboard import DashboardData
from app.services.data_loader import load_dashboard_payload

router = APIRouter(prefix="/api", tags=["dashboard"])

PIPELINE_MSG = "Dashboard data not available. Run the pipeline to generate data/output/engineers.json."


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard() -> DashboardData:
    """Full dashboard payload: meta, top5, all_engineers, network, highlights, team_stats, knowledge_map. 503 if pipeline not run."""
    payload = load_dashboard_payload()
    if payload is None:
        raise HTTPException(status_code=503, detail=PIPELINE_MSG)
    return payload

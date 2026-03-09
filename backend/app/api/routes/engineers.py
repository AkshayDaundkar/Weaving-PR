"""Engineers list and detail. Reads from data/output/engineers.json. 503 if missing."""

from fastapi import APIRouter, HTTPException, Query

from app.models.engineer import EngineerResponse
from app.services.data_loader import get_top_engineers, load_dashboard_payload

router = APIRouter(prefix="/api", tags=["engineers"])

PIPELINE_MSG = "Dashboard data not available. Run the pipeline to generate data/output/engineers.json."


@router.get("/engineers/top", response_model=list[EngineerResponse])
async def get_engineers_top(
    limit: int = Query(default=5, ge=1, le=20, description="Number of top engineers (max 20)"),
) -> list[EngineerResponse]:
    """Top N engineers by rank. 503 if pipeline has not been run."""
    result = get_top_engineers(limit=limit)
    if result is None:
        raise HTTPException(status_code=503, detail=PIPELINE_MSG)
    return result


@router.get("/engineers", response_model=list[EngineerResponse])
async def get_engineers(
    limit: int = Query(default=100, ge=1, le=500, description="Max number of engineers to return"),
) -> list[EngineerResponse]:
    """All engineers from the dashboard dataset, optionally limited. 503 if pipeline has not been run."""
    payload = load_dashboard_payload()
    if payload is None:
        raise HTTPException(status_code=503, detail=PIPELINE_MSG)
    return payload.all_engineers[:limit]


@router.get("/engineers/{login}", response_model=EngineerResponse)
async def get_engineer(login: str) -> EngineerResponse:
    """Single engineer by login. 404 if not in dataset; 503 if data missing."""
    payload = load_dashboard_payload()
    if payload is None:
        raise HTTPException(status_code=503, detail=PIPELINE_MSG)
    engineer = next((e for e in payload.all_engineers if e.login == login), None)
    if engineer is None:
        raise HTTPException(status_code=404, detail=f"Engineer '{login}' not found")
    return engineer

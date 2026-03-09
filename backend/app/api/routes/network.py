"""Collaboration network data. From same pipeline output as dashboard. 503 if data missing."""

from fastapi import APIRouter, HTTPException

from app.models.network import NetworkData
from app.services.data_loader import load_dashboard_payload

router = APIRouter(prefix="/api", tags=["network"])

PIPELINE_MSG = "Dashboard data not available. Run the pipeline to generate data/output/engineers.json."


@router.get("/network", response_model=NetworkData)
async def get_network() -> NetworkData:
    """Collaboration graph nodes and links. 503 if pipeline has not been run."""
    payload = load_dashboard_payload()
    if payload is None:
        raise HTTPException(status_code=503, detail=PIPELINE_MSG)
    return payload.collaboration_network

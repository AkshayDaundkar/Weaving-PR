"""Collaboration network data. Placeholder: returns minimal graph for UI."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["network"])


class NetworkNode(BaseModel):
    id: str
    label: str


class NetworkLink(BaseModel):
    source: str
    target: str
    weight: float = 1.0


class NetworkResponse(BaseModel):
    nodes: list[NetworkNode]
    links: list[NetworkLink]


@router.get("/network", response_model=NetworkResponse)
async def get_network() -> NetworkResponse:
    """Collaboration graph nodes and edges. Placeholder until pipeline adds real data."""
    # Minimal fixture so network viz can mount
    return NetworkResponse(
        nodes=[
            NetworkNode(id="alice", label="alice"),
            NetworkNode(id="bob", label="bob"),
        ],
        links=[NetworkLink(source="alice", target="bob", weight=1.0)],
    )

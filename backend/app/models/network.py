"""Pydantic models for collaboration network and graph data."""

from pydantic import BaseModel, Field


class NetworkNode(BaseModel):
    """Node in the collaboration/engineer network. Aligns with pipeline: id, size, group, label, avatar."""

    id: str
    login: str = ""
    name: str = ""
    avatar_url: str = ""
    avatar: str = ""  # alias used by pipeline
    value: float = 1.0
    size: float = 1.0
    group: str = ""
    label: str = ""


class NetworkLink(BaseModel):
    """Edge between two nodes (e.g. co-review, co-author)."""

    source: str
    target: str
    value: float = 1.0
    label: str = ""


class NetworkData(BaseModel):
    """Full network payload: nodes and links."""

    nodes: list[NetworkNode] = Field(default_factory=list)
    links: list[NetworkLink] = Field(default_factory=list)

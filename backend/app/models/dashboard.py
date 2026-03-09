"""Pydantic models for dashboard API: meta, aggregates, and full payload."""

from typing import Any

from pydantic import BaseModel, Field

from app.models.engineer import EngineerResponse
from app.models.network import NetworkData


class TeamStats(BaseModel):
    """Aggregate team-level stats over the analysis period."""

    total_prs_analyzed: int = 0
    total_prs_merged: int = 0
    total_reviews: int = 0
    total_engineers: int = 0
    avg_impact_score: float = 0.0
    period_days: int = 0


class DashboardMeta(BaseModel):
    """Metadata for the dashboard run (when, scope, version)."""

    generated_at: str = ""
    date_from: str = ""
    date_to: str = ""
    repo: str = ""  # e.g. PostHog/posthog
    total_prs_analyzed: int = 0
    total_engineers: int = 0
    methodology_version: str = ""


class DashboardData(BaseModel):
    """Full dashboard payload: meta, top 5, all engineers, network, highlights (logins), stats, knowledge map."""

    meta: DashboardMeta = Field(default_factory=DashboardMeta)
    top5: list[EngineerResponse] = Field(default_factory=list, description="Top 5 impactful engineers")
    all_engineers: list[EngineerResponse] = Field(default_factory=list)
    collaboration_network: NetworkData = Field(default_factory=NetworkData)
    hidden_heroes: list[str] = Field(default_factory=list, description="Logins of high review impact, lower PR output")
    rising_stars: list[str] = Field(default_factory=list, description="Logins with strong recent momentum")
    team_stats: TeamStats = Field(default_factory=TeamStats)
    knowledge_map: dict[str, list[dict[str, Any]]] = Field(
        default_factory=dict,
        description="Area -> list of {engineer, pr_count, pct_of_area} (pipeline/posthog shape)",
    )

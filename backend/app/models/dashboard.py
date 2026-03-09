"""Pydantic models for dashboard API responses."""

from pydantic import BaseModel, Field


class EngineerDimensions(BaseModel):
    """Normalized 0–100 scores per dimension."""

    pr_output: float = Field(ge=0, le=100, description="Complexity-weighted PR output")
    review_impact: float = Field(ge=0, le=100, description="Review impact score")
    velocity: float = Field(ge=0, le=100, description="Velocity score")
    quality: float = Field(ge=0, le=100, description="Quality score")


class EngineerSummary(BaseModel):
    """Summary of an engineer for dashboard list."""

    login: str
    avatar_url: str = ""
    github_url: str = ""
    rank: int
    impact_score: float = Field(ge=0, le=100)
    momentum: float = 0.0
    narrative: str = ""
    dimensions: EngineerDimensions = Field(default_factory=lambda: EngineerDimensions(pr_output=0, review_impact=0, velocity=0, quality=0))
    work_breakdown: dict[str, float] = Field(default_factory=dict)
    raw_stats: dict[str, int | float] = Field(default_factory=dict)


class DashboardResponse(BaseModel):
    """Full dashboard payload: top engineers + summary stats."""

    engineers: list[EngineerSummary] = Field(default_factory=list)
    generated_at: str = ""
    repo: str = ""
    lookback_days: int = 90

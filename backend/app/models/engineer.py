"""Pydantic models for engineer and PR entities."""

from pydantic import BaseModel, ConfigDict, Field


class EngineerDimensions(BaseModel):
    """Normalized 0–100 scores per dimension (complexity-weighted PR output, review, velocity, quality)."""

    pr_output: float = Field(ge=0, le=100, description="Complexity-weighted PR output")
    review_impact: float = Field(ge=0, le=100, description="Review impact score")
    velocity: float = Field(ge=0, le=100, description="Velocity score")
    quality: float = Field(ge=0, le=100, description="Quality score")


class TopPR(BaseModel):
    """Summary of a top PR for an engineer. complexity aligns with pipeline: trivial|moderate|significant|architectural."""

    number: int
    title: str = ""
    url: str = ""
    complexity: str = ""  # pipeline/LLM: trivial | moderate | significant | architectural
    work_type: str = ""  # e.g. feature, fix, refactor, chore
    additions: int = 0
    deletions: int = 0
    merged_at: str = ""


class EngineerResponse(BaseModel):
    """Full engineer payload for API: identity, rank, scores, breakdowns, top PRs, sparkline."""

    model_config = ConfigDict(extra="allow")

    login: str
    name: str = ""
    avatar_url: str = ""
    github_url: str = ""
    rank: int
    impact_score: float = Field(ge=0, le=100)
    momentum: float = 0.0
    narrative: str = ""
    dimensions: EngineerDimensions = Field(
        default_factory=lambda: EngineerDimensions(pr_output=0, review_impact=0, velocity=0, quality=0)
    )
    work_breakdown: dict[str, float] = Field(default_factory=dict)  # work_type -> share
    area_breakdown: dict[str, float] = Field(default_factory=dict)  # product_area -> share
    primary_area: str = ""
    areas_covered: list[str] = Field(default_factory=list)
    top_prs: list[TopPR] = Field(default_factory=list)
    weekly_impact: list[float] = Field(default_factory=list)  # e.g. 13 weeks
    raw_stats: dict[str, int | float] = Field(default_factory=dict)

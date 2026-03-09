"""Load dashboard/engineer data from file. No DB — file-based only."""

import json
from pathlib import Path

from app.core.config import get_settings
from app.models.dashboard import (
    DashboardResponse,
    EngineerDimensions,
    EngineerSummary,
)


def load_engineers_json() -> list[dict]:
    """Read raw engineers list from data/output/engineers.json. Returns [] if missing."""
    settings = get_settings()
    path = Path(settings.data_dir) / settings.output_file
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict) and "engineers" in raw:
        return raw["engineers"]
    return []


def _dims_from_row(dims: dict) -> EngineerDimensions:
    """Build EngineerDimensions from raw dict."""
    return EngineerDimensions(
        pr_output=float(dims.get("pr_output", 0)),
        review_impact=float(dims.get("review_impact", 0)),
        velocity=float(dims.get("velocity", 0)),
        quality=float(dims.get("quality", 0)),
    )


def build_dashboard_response() -> DashboardResponse:
    """Build dashboard payload from file. Uses fixture when file empty or missing."""
    raw_list = load_engineers_json()
    engineers: list[EngineerSummary] = []
    for i, row in enumerate(raw_list):
        try:
            dims = row.get("dimensions", {}) or {}
            engineers.append(
                EngineerSummary(
                    login=row.get("login", ""),
                    avatar_url=row.get("avatar_url", ""),
                    github_url=row.get("github_url", ""),
                    rank=row.get("rank", i + 1),
                    impact_score=float(row.get("impact_score", 0)),
                    momentum=float(row.get("momentum", 0)),
                    narrative=row.get("narrative", ""),
                    dimensions=_dims_from_row(dims) if isinstance(dims, dict) else dims,
                    work_breakdown=row.get("work_breakdown", {}),
                    raw_stats=row.get("raw_stats", {}),
                )
            )
        except Exception:
            continue
    # If no data, return minimal placeholder so UI works
    if not engineers:
        engineers = _fixture_engineers()
    return DashboardResponse(
        engineers=engineers,
        generated_at=raw_list[0].get("generated_at", "") if raw_list else "",
        repo=get_settings().github_org + "/" + get_settings().github_repo,
        lookback_days=90,
    )


def _fixture_engineers() -> list[EngineerSummary]:
    """Minimal fixture so UI works without real pipeline run."""
    from app.models.dashboard import EngineerDimensions

    return [
        EngineerSummary(
            login="alice",
            avatar_url="",
            github_url="https://github.com/alice",
            rank=1,
            impact_score=72.0,
            momentum=5.2,
            narrative="High impact across features and reviews.",
            dimensions=EngineerDimensions(pr_output=70, review_impact=75, velocity=68, quality=76),
            work_breakdown={"feature": 0.5, "fix": 0.3, "refactor": 0.2},
            raw_stats={"prs_merged": 24, "reviews": 41},
        ),
        EngineerSummary(
            login="bob",
            avatar_url="",
            github_url="https://github.com/bob",
            rank=2,
            impact_score=65.0,
            momentum=2.1,
            narrative="Strong in backend and reliability.",
            dimensions=EngineerDimensions(pr_output=68, review_impact=60, velocity=70, quality=62),
            work_breakdown={"feature": 0.4, "fix": 0.4, "refactor": 0.2},
            raw_stats={"prs_merged": 19, "reviews": 28},
        ),
    ]

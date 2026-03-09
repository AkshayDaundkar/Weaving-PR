"""Scoring: per-PR complexity (file type/size/breadth × LLM multiplier), review impact, velocity, quality."""

import math
import re
from datetime import datetime, timezone, timedelta

from scripts.utils.areas import get_all_areas

COMPLEXITY_MULTIPLIERS = {
    "trivial": 0.5,
    "moderate": 1.0,
    "significant": 1.7,
    "architectural": 2.8,
}

FILE_WEIGHTS = {
    ".py": 1.0,
    ".ts": 1.0,
    ".tsx": 0.9,
    ".rs": 1.3,
    ".js": 0.8,
    ".css": 0.3,
    ".scss": 0.3,
    ".json": 0.2,
    ".yaml": 0.2,
    ".yml": 0.2,
    ".md": 0.1,
    ".sql": 0.9,
}

ISSUE_LINKED_RE = re.compile(
    r"(fixes|closes|resolves|fix|close|resolve)\s+#\d+",
    re.IGNORECASE,
)


def _ext(path: str) -> str:
    if "." in path:
        return "." + path.rsplit(".", 1)[-1].lower()
    return ""


def get_file_paths(pr: dict) -> list[str]:
    """File paths from pr (files as list or files.nodes)."""
    files = pr.get("files") or []
    if isinstance(files, dict):
        files = files.get("nodes") or []
    return [str(f.get("path") or "") for f in files if isinstance(f, dict) and f.get("path")]


def _get_paths(pr: dict) -> list[str]:
    return get_file_paths(pr)


def compute_proxy_complexity(pr: dict) -> float:
    """Per-PR complexity: file type weights + log(size) + log(breadth). No LLM here."""
    paths = _get_paths(pr)
    if not paths:
        avg_weight = 0.6
    else:
        weights = [FILE_WEIGHTS.get(_ext(p), 0.6) for p in paths]
        avg_weight = sum(weights) / len(weights)

    additions = pr.get("additions") or 0
    deletions = pr.get("deletions") or 0
    size_signal = math.log(1 + additions + deletions)
    breadth_signal = math.log(1 + len(paths) or 1)
    return avg_weight * (0.55 * size_signal + 0.45 * breadth_signal)


def percentile_rank(value: float, all_values: list[float]) -> float:
    """0–100 score; max value gets 100 (inclusive ranking)."""
    if not all_values:
        return 0.0
    if len(all_values) == 1:
        return 100.0
    below = sum(1 for v in all_values if v < value)
    equal = sum(1 for v in all_values if v == value)
    return min(100.0, 100.0 * (below + 0.5 * equal) / len(all_values))


def review_depth_score(review: dict, pr_complexity: float) -> float:
    """Single review: state base + comment bonus, weighted by PR complexity. Depth × reviewed PR complexity."""
    state = (review.get("state") or "COMMENTED").upper()
    base = {"CHANGES_REQUESTED": 2.5, "COMMENTED": 0.8, "APPROVED": 0.4}.get(state, 0.4)
    comments = review.get("comments", {}).get("nodes", []) or []
    if isinstance(comments, list):
        substantive = [c for c in comments if len((c.get("body") or "").strip()) > 80]
        comment_bonus = sum(min(len((c.get("body") or "")) / 350, 1.8) for c in substantive)
    else:
        comment_bonus = 0.0
    depth = base + comment_bonus
    return depth * math.log(1 + pr_complexity)


def _reviews_from_pr(pr: dict) -> list[dict]:
    """Reviews list from pr (reviews or reviews.nodes)."""
    reviews = pr.get("reviews") or []
    if isinstance(reviews, dict):
        reviews = reviews.get("nodes") or []
    return reviews if isinstance(reviews, list) else []


def velocity_score(
    engineer_login: str,
    all_prs: list[dict],
    pr_complexity_by_number: dict[int, float],
) -> tuple[float, list[float]]:
    """Median time to first review (hours), inverted to 0–100. Returns (score, list of hours)."""
    first_review_hours: list[float] = []
    for pr in all_prs:
        author = (pr.get("author") or {}).get("login")
        if author == engineer_login:
            continue
        reviews = _reviews_from_pr(pr)
        reviews = sorted(reviews, key=lambda r: r.get("submittedAt") or "")
        if not reviews:
            continue
        first_reviewer = (reviews[0].get("author") or {}).get("login")
        if first_reviewer != engineer_login:
            continue
        created = pr.get("createdAt") or ""
        submitted = reviews[0].get("submittedAt") or ""
        if not created or not submitted:
            continue
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            submitted_dt = datetime.fromisoformat(submitted.replace("Z", "+00:00"))
            hours = (submitted_dt - created_dt).total_seconds() / 3600
            if 0.5 <= hours <= 120:
                first_review_hours.append(hours)
        except (ValueError, TypeError):
            pass
    if len(first_review_hours) < 3:
        return 0.0, first_review_hours
    median_h = sorted(first_review_hours)[len(first_review_hours) // 2]
    raw_velocity = 100 / (1 + math.log(1 + median_h))
    return min(100.0, raw_velocity), first_review_hours


def quality_score(
    merged_prs: list[dict],
    pr_has_changes_requested: dict[int, bool],
) -> float:
    """Issue-linked, first-pass approval, area breadth → 0–100."""
    if not merged_prs:
        return 0.0
    issue_linked = sum(
        1 for p in merged_prs
        if ISSUE_LINKED_RE.search(p.get("body") or "")
    )
    issue_linked_rate = issue_linked / len(merged_prs)

    first_pass = sum(
        1 for p in merged_prs
        if not pr_has_changes_requested.get(p.get("number"), False)
    )
    first_pass_rate = first_pass / len(merged_prs)

    areas = set()
    for p in merged_prs:
        areas.update(get_all_areas(_get_paths(p)))
    breadth_bonus = min(len(areas) / 3, 1.0)

    quality_raw = issue_linked_rate * 35 + first_pass_rate * 35 + breadth_bonus * 20 + 10
    return min(100.0, quality_raw)


def _parse_dt(s: str) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def compute_weekly_impact(
    merged_prs: list[dict], pr_complexity: dict[int, float]
) -> list[float]:
    """Per-week complexity sum for last 13 weeks (index 0 = oldest)."""
    now = datetime.now(timezone.utc)
    weekly = [0.0] * 13
    for p in merged_prs:
        dt = _parse_dt(p.get("mergedAt") or "")
        if not dt:
            continue
        days_ago = (now - dt).days
        week_idx = days_ago // 7
        if 0 <= week_idx < 13:
            weekly[week_idx] += pr_complexity.get(p.get("number"), 0)
    return list(reversed(weekly))


def compute_momentum(
    merged_prs: list[dict],
    pr_complexity: dict[int, float],
) -> float:
    """Recent 30d vs prior 60d complexity rate; return percent change."""
    now = datetime.now(timezone.utc)
    cutoff_recent = now - timedelta(days=30)
    cutoff_early = now - timedelta(days=90)

    def pr_date(p: dict):
        return _parse_dt(p.get("mergedAt") or "")

    early = sum(
        pr_complexity.get(p.get("number"), 0)
        for p in merged_prs
        if pr_date(p) and cutoff_early <= pr_date(p) < cutoff_recent
    )
    recent = sum(
        pr_complexity.get(p.get("number"), 0)
        for p in merged_prs
        if pr_date(p) and pr_date(p) >= cutoff_recent
    )
    early_rate = early / 60.0 if early else 0
    recent_rate = recent / 30.0 if recent else 0
    if early_rate < 0.001:
        return 0.0
    return round((recent_rate - early_rate) / early_rate * 100, 1)

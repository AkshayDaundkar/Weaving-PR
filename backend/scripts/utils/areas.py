"""Map file paths to product areas: analytics, session_replay, feature_flags, etc."""

from collections import defaultdict

# Prefix (substring in path) -> product_area. Order matters: first match wins for single-area; all matches for breadth.
AREA_MAP = [
    ("feature_flag", "feature_flags"),
    ("feature-flag", "feature_flags"),
    ("session_recording", "session_replay"),
    ("session-recordings", "session_replay"),
    ("session_replay", "session_replay"),
    ("hogql", "analytics"),
    ("queries", "analytics"),
    ("/api/", "analytics"),
    ("insights", "analytics"),
    ("trends", "analytics"),
    ("warehouse", "data_warehouse"),
    ("batch_exports", "data_warehouse"),
    ("survey", "surveys"),
    ("surveys", "surveys"),
    ("error_tracking", "error_tracking"),
    ("error_track", "error_tracking"),
    ("plugin-server", "ingestion"),
    ("/ingestion/", "ingestion"),
    ("temporal", "infrastructure"),
    ("tasks", "infrastructure"),
    ("management/", "infrastructure"),
    ("migrations/", "infrastructure"),
    ("k8s", "infrastructure"),
    ("docker", "infrastructure"),
    (".github/", "infrastructure"),
    ("dags/", "infrastructure"),
    ("frontend/src/scenes/", "frontend_core"),
    ("frontend/src/components/", "frontend_core"),
    ("frontend/src/", "frontend_core"),
    ("test", "other"),
    ("tests/", "other"),
    ("__tests__", "other"),
]

ALL_AREAS = {
    "analytics",
    "session_replay",
    "feature_flags",
    "surveys",
    "data_warehouse",
    "error_tracking",
    "ingestion",
    "frontend_core",
    "infrastructure",
    "other",
}


def _paths_from_pr(pr: dict) -> list[str]:
    """Return list of file paths from pr (files as list or files.nodes)."""
    files = pr.get("files") or []
    if isinstance(files, dict):
        files = files.get("nodes") or []
    return [str(f.get("path") or "") for f in files if isinstance(f, dict) and f.get("path")]


def classify_product_area(file_paths: list[str]) -> str:
    """Primary product area by most touched files. Returns one of ALL_AREAS."""
    area_counts: dict[str, int] = defaultdict(int)
    for path in file_paths:
        for prefix, area in AREA_MAP:
            if prefix in path:
                area_counts[area] += 1
                break
        else:
            area_counts["other"] += 1
    if not area_counts:
        return "other"
    return max(area_counts, key=area_counts.get)


def get_all_areas(file_paths: list[str]) -> list[str]:
    """All product areas touched (for breadth)."""
    areas: set[str] = set()
    for path in file_paths:
        for prefix, area in AREA_MAP:
            if prefix in path:
                areas.add(area)
                break
        else:
            areas.add("other")
    return sorted(areas)


def primary_area_display(area_breakdown: dict[str, float]) -> str:
    """Prefer first non-'other' area for display; fallback 'other'."""
    if not area_breakdown:
        return "other"
    sorted_areas = sorted(area_breakdown.items(), key=lambda x: x[1], reverse=True)
    for area, _ in sorted_areas:
        if area != "other":
            return area
    return "other"

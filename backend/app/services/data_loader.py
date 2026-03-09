"""Load dashboard/engineer data from file. Returns parsed payload or None if missing."""

import json

from app.core.config import get_settings
from app.models.engineer import (
    EngineerDimensions,
    EngineerResponse,
    TopPR,
)
from app.models.dashboard import (
    DashboardData,
    DashboardMeta,
    TeamStats,
)
from app.models.network import NetworkData, NetworkLink, NetworkNode


def _dims_from_row(dims: dict) -> EngineerDimensions:
    if not isinstance(dims, dict):
        return EngineerDimensions(pr_output=0, review_impact=0, velocity=0, quality=0)
    return EngineerDimensions(
        pr_output=float(dims.get("pr_output", 0)),
        review_impact=float(dims.get("review_impact", 0)),
        velocity=float(dims.get("velocity", 0)),
        quality=float(dims.get("quality", 0)),
    )


def _top_pr_from_row(pr: dict) -> TopPR:
    if not isinstance(pr, dict):
        return TopPR(number=0, title="", url="")
    comp = pr.get("complexity")
    if isinstance(comp, (int, float)):
        comp = "moderate" if comp else "trivial"
    else:
        comp = str(comp or "")
    return TopPR(
        number=int(pr.get("number", 0)),
        title=str(pr.get("title", "")),
        url=str(pr.get("url", "")),
        complexity=comp,
        work_type=str(pr.get("work_type", "")),
        additions=int(pr.get("additions", 0)),
        deletions=int(pr.get("deletions", 0)),
        merged_at=str(pr.get("merged_at", "")),
    )


def _engineer_from_row(row: dict, rank: int) -> EngineerResponse | None:
    if not isinstance(row, dict):
        return None
    try:
        dims = row.get("dimensions", {}) or {}
        top_prs_raw = row.get("top_prs", [])
        top_prs = [_top_pr_from_row(p) for p in top_prs_raw if isinstance(p, dict)]
        return EngineerResponse(
            login=row.get("login", ""),
            name=row.get("name", ""),
            avatar_url=row.get("avatar_url", ""),
            github_url=row.get("github_url", ""),
            rank=rank,
            impact_score=float(row.get("impact_score", 0)),
            momentum=float(row.get("momentum", 0)),
            narrative=row.get("narrative", ""),
            dimensions=_dims_from_row(dims),
            work_breakdown=row.get("work_breakdown", {}),
            area_breakdown=row.get("area_breakdown", {}),
            primary_area=row.get("primary_area", ""),
            areas_covered=row.get("areas_covered", []) or [],
            top_prs=top_prs,
            weekly_impact=row.get("weekly_impact", []) or [],
            raw_stats=row.get("raw_stats", {}),
        )
    except Exception:
        return None


def _parse_network(data: dict) -> NetworkData:
    nodes = []
    for n in data.get("nodes", []) or []:
        if isinstance(n, dict) and n.get("id"):
            avatar = n.get("avatar_url") or n.get("avatar") or ""
            nodes.append(
                NetworkNode(
                    id=n["id"],
                    login=n.get("login", ""),
                    name=n.get("name", ""),
                    avatar_url=avatar,
                    avatar=avatar,
                    value=float(n.get("value", 1)),
                    size=float(n.get("size", 1)),
                    group=str(n.get("group", "")),
                    label=str(n.get("label", n.get("login", n["id"]))),
                )
            )
    links = []
    for e in data.get("links", []) or []:
        if isinstance(e, dict) and e.get("source") and e.get("target"):
            links.append(
                NetworkLink(
                    source=e["source"],
                    target=e["target"],
                    value=float(e.get("value", 1)),
                    label=str(e.get("label", "")),
                )
            )
    return NetworkData(nodes=nodes, links=links)


def load_dashboard_payload() -> DashboardData | None:
    """
    Read data/output/engineers.json and return parsed DashboardData.
    Returns None if the file is missing or empty so the API can return 503.
    """
    settings = get_settings()
    path = settings.output_path / "engineers.json"
    if not path.exists():
        return None
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    raw_list: list[dict] = []
    meta_dict: dict = {}
    collaboration_network = NetworkData()
    hidden_heroes: list[str] = []
    rising_stars: list[str] = []
    team_stats_dict: dict = {}
    knowledge_map: dict = {}

    if isinstance(data, list):
        raw_list = data
    elif isinstance(data, dict):
        raw_list = data.get("all_engineers", data.get("engineers", data.get("top5", []))) or []
        meta_dict = {k: v for k, v in data.items() if k not in ("engineers", "all_engineers", "top5", "collaboration_network", "hidden_heroes", "rising_stars", "team_stats", "knowledge_map")}
        if "collaboration_network" in data and isinstance(data["collaboration_network"], dict):
            collaboration_network = _parse_network(data["collaboration_network"])
        for key, list_key in (("hidden_heroes", hidden_heroes), ("rising_stars", rising_stars)):
            if key in data and isinstance(data[key], list):
                for r in data[key]:
                    if isinstance(r, str):
                        list_key.append(r)
                    elif isinstance(r, dict) and r.get("login"):
                        list_key.append(r["login"])
        if "team_stats" in data and isinstance(data["team_stats"], dict):
            team_stats_dict = data["team_stats"]
        if "knowledge_map" in data and isinstance(data["knowledge_map"], dict):
            knowledge_map = {k: v if isinstance(v, list) else [] for k, v in data["knowledge_map"].items()}
    else:
        return None

    engineers: list[EngineerResponse] = []
    for i, row in enumerate(raw_list):
        eng = _engineer_from_row(row, i + 1)
        if eng and eng.login:
            engineers.append(eng)

    n = len(engineers)
    meta = DashboardMeta(
        generated_at=meta_dict.get("generated_at", ""),
        date_from=meta_dict.get("date_from", ""),
        date_to=meta_dict.get("date_to", ""),
        repo=meta_dict.get("repo", f"{settings.github_org}/{settings.github_repo}"),
        total_prs_analyzed=int(meta_dict.get("total_prs_analyzed", 0)),
        total_engineers=int(meta_dict.get("total_engineers", n)),
        methodology_version=str(meta_dict.get("methodology_version", "")),
    )
    team_stats = TeamStats(
        total_prs_analyzed=int(team_stats_dict.get("total_prs_analyzed", meta_dict.get("total_prs_analyzed", 0))),
        total_prs_merged=int(team_stats_dict.get("total_prs_merged", 0)),
        total_reviews=int(team_stats_dict.get("total_reviews", 0)),
        total_engineers=int(team_stats_dict.get("total_engineers", n)),
        avg_impact_score=float(team_stats_dict.get("avg_impact_score", 0)),
        period_days=int(team_stats_dict.get("period_days", meta_dict.get("lookback_days", settings.days_lookback))),
    )
    top5 = engineers[:5]
    return DashboardData(
        meta=meta,
        top5=top5,
        all_engineers=engineers,
        collaboration_network=collaboration_network,
        hidden_heroes=hidden_heroes,
        rising_stars=rising_stars,
        team_stats=team_stats,
        knowledge_map=knowledge_map,
    )


def get_top_engineers(limit: int = 5) -> list[EngineerResponse] | None:
    """Return top N engineers by rank. None if data is not available."""
    payload = load_dashboard_payload()
    if payload is None:
        return None
    return payload.all_engineers[:limit]


def get_engineer_by_login(login: str) -> EngineerResponse | None:
    """Return one engineer by login, or None if not found or data missing."""
    payload = load_dashboard_payload()
    if payload is None:
        return None
    for e in payload.all_engineers:
        if e.login == login:
            return e
    return None

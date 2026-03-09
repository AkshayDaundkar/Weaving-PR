"""Build collaboration network: nodes = engineers, links = reviewer → author with weight."""

from collections import defaultdict


def _reviews_from_pr(pr: dict) -> list[dict]:
    """Reviews list from pr (reviews or reviews.nodes)."""
    reviews = pr.get("reviews") or []
    if isinstance(reviews, dict):
        reviews = reviews.get("nodes") or []
    return reviews if isinstance(reviews, list) else []


def build_collaboration_network(
    engineers: list[dict],
    all_prs: list[dict],
    min_reviews: int = 2,
) -> dict[str, list[dict]]:
    """Nodes: engineers (id, size=impact_score, group=primary_area, label, avatar).
    Links: source=reviewer, target=author, value=review count. Only links >= min_reviews."""
    edges: dict[tuple[str, str], int] = defaultdict(int)
    for pr in all_prs:
        author = (pr.get("author") or {}).get("login")
        if not author or "[bot]" in author:
            continue
        for review in _reviews_from_pr(pr):
            reviewer = (review.get("author") or {}).get("login")
            if not reviewer or reviewer == author or "[bot]" in reviewer:
                continue
            edges[(reviewer, author)] += 1

    engineer_by_login = {e["login"]: e for e in engineers}
    nodes = []
    for e in engineers:
        nodes.append({
            "id": e["login"],
            "login": e.get("login", ""),
            "name": e.get("name", ""),
            "avatar_url": e.get("avatar_url", ""),
            "avatar": e.get("avatar_url", ""),
            "value": e.get("impact_score", 0),
            "size": e.get("impact_score", 0),
            "group": e.get("primary_area", "other"),
            "label": e.get("login", ""),
        })

    links = []
    for (reviewer, author), count in edges.items():
        if count >= min_reviews and reviewer in engineer_by_login and author in engineer_by_login:
            links.append({
                "source": reviewer,
                "target": author,
                "value": count,
                "label": f"{count} reviews",
            })

    return {"nodes": nodes, "links": links}

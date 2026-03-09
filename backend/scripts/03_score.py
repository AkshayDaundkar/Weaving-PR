#!/usr/bin/env python3
"""Score engineers from prs.json + llm_cache.json. Output data/output/engineers.json with meta, top5, all_engineers, collaboration_network, hidden_heroes, rising_stars, team_stats."""

import json
import sys
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.config import get_settings
from scripts.utils.areas import (
    classify_product_area,
    get_all_areas,
    primary_area_display,
)
from scripts.utils.scoring import (
    COMPLEXITY_MULTIPLIERS,
    ISSUE_LINKED_RE,
    compute_momentum,
    compute_proxy_complexity,
    compute_weekly_impact,
    get_file_paths,
    percentile_rank,
    quality_score,
    review_depth_score,
    velocity_score,
)
from scripts.utils.network import build_collaboration_network


def _parse_dt(s: str) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _reviews_from_pr(pr: dict) -> list[dict]:
    reviews = pr.get("reviews") or []
    if isinstance(reviews, dict):
        reviews = reviews.get("nodes") or []
    return reviews if isinstance(reviews, list) else []


def work_type_from_title(title: str) -> str:
    """Heuristic from conventional commit when LLM returns chore."""
    lower = (title or "").lower()
    if lower.startswith("feat"): return "feature"
    if lower.startswith("fix"): return "bugfix"
    if lower.startswith("refactor"): return "refactor"
    if lower.startswith("test"): return "test"
    if lower.startswith("docs"): return "docs"
    if lower.startswith("chore") or lower.startswith("build"): return "infra"
    return "chore"


def build_narrative(
    login: str,
    merged: list[dict],
    review_count: int,
    primary_area: str,
    areas_covered: list[str],
    top_prs_list: list[dict],
) -> str:
    area_display = primary_area.replace("_", " ")
    areas_note = f" and {len(areas_covered) - 1} other areas" if len(areas_covered) > 2 else ""
    if top_prs_list:
        top_title = (top_prs_list[0].get("title") or "")[:60]
        return (
            f"Shipped {len(merged)} PRs in {area_display}{areas_note} "
            f"(e.g. \"{top_title}\") and gave {review_count} reviews."
        )
    return f"Shipped {len(merged)} PRs across {area_display} and gave {review_count} reviews."


def load_prs_and_cache() -> tuple[list[dict], dict[int, dict], object, dict[str, dict]]:
    settings = get_settings()
    raw_path = settings.raw_path
    processed_path = settings.processed_path

    prs_file = raw_path / "prs.json"
    if not prs_file.exists():
        raise FileNotFoundError("Run 01_collect.py first.")
    with open(prs_file, encoding="utf-8") as f:
        prs = json.load(f)

    cache_file = processed_path / "llm_cache.json"
    raw_cache: dict = {}
    if cache_file.exists():
        with open(cache_file, encoding="utf-8") as f:
            raw_cache = json.load(f)
    llm_cache: dict[int, dict] = {}
    for k, v in raw_cache.items():
        try:
            llm_cache[int(k)] = v
        except (ValueError, TypeError):
            llm_cache[k] = v

    members_file = raw_path / "members.json"
    members_by_login: dict[str, dict] = {}
    if members_file.exists():
        with open(members_file, encoding="utf-8") as f:
            members = json.load(f)
        for m in members if isinstance(members, list) else []:
            if isinstance(m, dict) and m.get("login"):
                members_by_login[m["login"]] = m
    return prs, llm_cache, settings, members_by_login


def main() -> None:
    prs, llm_cache, settings, members_by_login = load_prs_and_cache()
    min_prs = settings.min_prs_to_qualify
    min_reviews = settings.min_reviews_to_qualify
    days = settings.days_lookback
    org, repo = settings.github_org, settings.github_repo
    repo_url = f"https://github.com/{org}/{repo}"

    # 1) Per-PR complexity: file type/size/breadth × LLM complexity multiplier
    pr_complexity: dict[int, float] = {}
    pr_has_changes_requested: dict[int, bool] = {}
    for p in prs:
        num = p.get("number")
        proxy = compute_proxy_complexity(p)
        cls = llm_cache.get(num, {})
        mult = COMPLEXITY_MULTIPLIERS.get(
            (cls.get("complexity") or "moderate").lower(),
            1.0,
        )
        pr_complexity[num] = proxy * mult

        reviews = _reviews_from_pr(p)
        author_login = (p.get("author") or {}).get("login")
        pr_has_changes_requested[num] = any(
            r.get("state") == "CHANGES_REQUESTED"
            and (r.get("author") or {}).get("login") != author_login
            for r in reviews
        )

    # Authors and reviewers
    author_prs: dict[str, list[dict]] = defaultdict(list)
    reviewer_reviews: dict[str, list[tuple[dict, dict]]] = defaultdict(list)
    for p in prs:
        if not p.get("mergedAt"):
            continue
        author = (p.get("author") or {}).get("login")
        if author and "[bot]" not in author:
            author_prs[author].append(p)
        for r in _reviews_from_pr(p):
            rev = (r.get("author") or {}).get("login")
            if rev and "[bot]" not in rev and rev != author:
                reviewer_reviews[rev].append((r, p))

    all_logins = set(author_prs) | set(reviewer_reviews)
    qualified = [
        login for login in all_logins
        if len(author_prs.get(login, [])) >= min_prs
        or len(reviewer_reviews.get(login, [])) >= min_reviews
    ]

    # 2–3) Raw dimension values and percentile-rank 0–100
    raw_pr_outputs: list[float] = []
    raw_review_impacts: list[float] = []
    raw_velocities: list[float] = []
    raw_qualities: list[float] = []

    for login in qualified:
        merged = author_prs.get(login, [])
        raw_pr = sum(pr_complexity.get(p.get("number"), 0) for p in merged)
        raw_pr_outputs.append(raw_pr)

        review_impact = 0.0
        for r, p in reviewer_reviews.get(login, []):
            if (p.get("author") or {}).get("login") == login:
                continue
            review_impact += review_depth_score(r, pr_complexity.get(p.get("number"), 0))
        raw_review_impacts.append(review_impact)

        vel, _ = velocity_score(login, prs, pr_complexity)
        raw_velocities.append(vel)

        qual = quality_score(merged, pr_has_changes_requested)
        raw_qualities.append(qual)

    # Build engineer records with percentile-ranked dimensions and composite impact_score
    engineers: list[dict] = []
    for login in qualified:
        merged = author_prs.get(login, [])
        reviews_list = reviewer_reviews.get(login, [])

        pr_out = sum(pr_complexity.get(p.get("number"), 0) for p in merged)
        pr_score = percentile_rank(pr_out, raw_pr_outputs)

        review_impact = 0.0
        for r, p in reviews_list:
            if (p.get("author") or {}).get("login") == login:
                continue
            review_impact += review_depth_score(r, pr_complexity.get(p.get("number"), 0))
        review_score = percentile_rank(review_impact, raw_review_impacts) if raw_review_impacts else 0.0

        vel_score, first_review_hours = velocity_score(login, prs, pr_complexity)
        vel_ranked = percentile_rank(vel_score, raw_velocities) if raw_velocities else 0.0

        qual = quality_score(merged, pr_has_changes_requested)
        qual_ranked = percentile_rank(qual, raw_qualities) if raw_qualities else 0.0

        # 4) Composite impact_score
        impact_score = (
            0.40 * pr_score
            + 0.25 * review_score
            + 0.20 * vel_ranked
            + 0.15 * qual_ranked
        )

        # Work/area breakdown, top PRs, weekly_impact, momentum, narrative
        work_breakdown: dict[str, int] = defaultdict(int)
        area_breakdown: dict[str, int] = defaultdict(int)
        top_prs_list: list[dict] = []

        for p in merged:
            num = p.get("number")
            cls = llm_cache.get(num, {})
            wt = (cls.get("work_type") or "").lower()
            if wt == "chore" or not wt:
                wt = work_type_from_title(p.get("title") or "")
            work_breakdown[wt] = work_breakdown.get(wt, 0) + 1
            paths = get_file_paths(p)
            area = classify_product_area(paths)
            area_breakdown[area] = area_breakdown.get(area, 0) + 1
            top_prs_list.append({
                "number": num,
                "title": (p.get("title") or "")[:80],
                "url": p.get("url") or f"{repo_url}/pull/{num}",
                "complexity": (cls.get("complexity") or "moderate").lower(),
                "work_type": wt,
                "additions": p.get("additions", 0),
                "deletions": p.get("deletions", 0),
                "merged_at": p.get("mergedAt", ""),
            })

        top_prs_list.sort(key=lambda x: pr_complexity.get(x["number"], 0), reverse=True)
        top_prs_list = top_prs_list[:5]

        total_work = sum(work_breakdown.values()) or 1
        total_area = sum(area_breakdown.values()) or 1
        work_breakdown_pct = {k: round(100 * v / total_work, 1) for k, v in work_breakdown.items()}
        area_breakdown_pct = {k: round(100 * v / total_area, 1) for k, v in area_breakdown.items()}
        primary_area = primary_area_display(area_breakdown_pct)

        all_paths: list[str] = []
        for p in merged:
            all_paths.extend(get_file_paths(p))
        areas_covered = get_all_areas(all_paths)

        weekly_impact = compute_weekly_impact(merged, pr_complexity)
        momentum = compute_momentum(merged, pr_complexity)

        mem = members_by_login.get(login, {})
        avatar_url = mem.get("avatarUrl") or ""
        name = mem.get("name") or ""
        if not avatar_url:
            avatar_url = f"https://github.com/{login}.png"
        github_url = f"https://github.com/{login}"

        review_count = len(reviews_list)
        comment_count = sum(
            len((r.get("comments") or {}).get("nodes") or [])
            for r, _ in reviews_list
        )
        first_reviewed = 0
        for p in prs:
            if (p.get("author") or {}).get("login") == login:
                continue
            nodes = _reviews_from_pr(p)
            if not nodes:
                continue
            first_reviewer = (nodes[0].get("author") or {}).get("login")
            if first_reviewer == login:
                first_reviewed += 1
        authors_reviewed = len(set((p.get("author") or {}).get("login") for _, p in reviews_list))
        median_hrs = 0.0
        if first_review_hours:
            median_hrs = sorted(first_review_hours)[len(first_review_hours) // 2]
        issue_linked = sum(1 for p in merged if ISSUE_LINKED_RE.search(p.get("body") or ""))
        first_pass = sum(1 for p in merged if not pr_has_changes_requested.get(p.get("number"), False))

        narrative = build_narrative(login, merged, review_count, primary_area, areas_covered, top_prs_list)

        engineers.append({
            "login": login,
            "name": name,
            "avatar_url": avatar_url,
            "github_url": github_url,
            "rank": 0,
            "impact_score": round(impact_score, 1),
            "momentum": momentum,
            "narrative": narrative,
            "dimensions": {
                "pr_output": round(pr_score, 1),
                "review_impact": round(review_score, 1),
                "velocity": round(vel_ranked, 1),
                "quality": round(qual_ranked, 1),
            },
            "work_breakdown": work_breakdown_pct,
            "area_breakdown": area_breakdown_pct,
            "primary_area": primary_area,
            "areas_covered": areas_covered,
            "top_prs": top_prs_list,
            "weekly_impact": weekly_impact,
            "raw_stats": {
                "prs_merged": len(merged),
                "total_additions": sum(p.get("additions", 0) for p in merged),
                "total_deletions": sum(p.get("deletions", 0) for p in merged),
                "reviews_given": review_count,
                "review_comments_written": comment_count,
                "prs_first_reviewed": first_reviewed,
                "distinct_authors_reviewed": authors_reviewed,
                "median_review_time_hours": round(median_hrs, 1),
                "issue_linked_prs": issue_linked,
                "first_pass_approved_prs": first_pass,
            },
        })

    engineers.sort(key=lambda e: e["impact_score"], reverse=True)
    for i, e in enumerate(engineers):
        e["rank"] = i + 1

    # 6–7) hidden_heroes, rising_stars
    pr_scores = [e["dimensions"]["pr_output"] for e in engineers]
    review_scores = [e["dimensions"]["review_impact"] for e in engineers]
    q75_review = sorted(review_scores)[int(0.75 * len(review_scores))] if review_scores else 0
    med_pr = sorted(pr_scores)[len(pr_scores) // 2] if pr_scores else 0
    hidden_heroes = [
        e["login"] for e in engineers
        if e["dimensions"]["review_impact"] >= q75_review and e["dimensions"]["pr_output"] < med_pr
    ]

    top5_logins = {e["login"] for e in engineers[:5]}
    rising_stars = [
        e["login"] for e in engineers
        if e["momentum"] > 35 and e["login"] not in top5_logins and e["raw_stats"]["prs_merged"] >= 3
    ]

    # 5) Collaboration network
    network = build_collaboration_network(engineers, prs, min_reviews=2)

    # Team stats
    total_prs_merged = len([p for p in prs if p.get("mergedAt")])
    total_reviews = sum(len(_reviews_from_pr(p)) for p in prs)
    all_first_review_hours: list[float] = []
    for p in prs:
        if not p.get("mergedAt"):
            continue
        reviews = sorted(_reviews_from_pr(p), key=lambda r: r.get("submittedAt") or "")
        if not reviews:
            continue
        try:
            created = _parse_dt(p.get("createdAt") or "")
            first_submitted = _parse_dt(reviews[0].get("submittedAt") or "")
            if created and first_submitted:
                hours = (first_submitted - created).total_seconds() / 3600
                if 0.5 <= hours <= 120:
                    all_first_review_hours.append(hours)
        except (ValueError, KeyError, TypeError):
            continue
    avg_ttr = round(sum(all_first_review_hours) / len(all_first_review_hours), 1) if all_first_review_hours else 0.0
    first_pass_team = sum(
        1 for p in prs
        if p.get("mergedAt") and not pr_has_changes_requested.get(p.get("number"), False)
    )
    team_stats = {
        "total_prs_analyzed": total_prs_merged,
        "total_prs_merged": total_prs_merged,
        "total_reviews": total_reviews,
        "total_engineers": len(engineers),
        "avg_impact_score": round(sum(e["impact_score"] for e in engineers) / len(engineers), 1) if engineers else 0,
        "period_days": days,
        "avg_time_to_first_review_hours": avg_ttr,
        "first_pass_approval_rate": round(100 * first_pass_team / total_prs_merged, 1) if total_prs_merged else 0,
    }

    date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    date_from = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_from": date_from,
        "date_to": date_to,
        "repo": f"{org}/{repo}",
        "total_prs_analyzed": total_prs_merged,
        "total_engineers": len(engineers),
        "methodology_version": "1.0",
    }

    # Knowledge map: area -> top contributors
    knowledge_map: dict[str, list[dict]] = defaultdict(list)
    for e in engineers:
        for area, pct in e["area_breakdown"].items():
            if pct > 0:
                knowledge_map[area].append({
                    "engineer": e["login"],
                    "pr_count": e["raw_stats"]["prs_merged"],
                    "pct_of_area": pct,
                })
    for area in knowledge_map:
        knowledge_map[area] = sorted(
            knowledge_map[area],
            key=lambda x: x["pct_of_area"],
            reverse=True,
        )[:10]
    knowledge_map = dict(knowledge_map)

    payload = {
        "meta": meta,
        "top5": engineers[:5],
        "all_engineers": engineers,
        "collaboration_network": network,
        "hidden_heroes": hidden_heroes,
        "rising_stars": rising_stars,
        "team_stats": team_stats,
        "knowledge_map": knowledge_map,
    }

    out_path = settings.output_path
    out_path.mkdir(parents=True, exist_ok=True)
    out_file = out_path / "engineers.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=str)
    print(f"Wrote {out_file} ({len(engineers)} engineers, top 5 ranked)")


if __name__ == "__main__":
    main()

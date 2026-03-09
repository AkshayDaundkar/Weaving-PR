"""GitHub GraphQL client: fetch merged PRs (cursor-paginated) and org members (login, name, avatarUrl)."""

import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Callable

import httpx

# Add backend to path so we can import app config when run from repo root or scripts/
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND = SCRIPT_DIR.parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.config import get_settings

PRS_QUERY = """
query GetMergedPRs($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(
      first: 100
      after: $cursor
      states: [MERGED]
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        body
        createdAt
        mergedAt
        additions
        deletions
        author { login }
        files(first: 100) {
          nodes { path additions deletions }
        }
        reviews(first: 100) {
          nodes {
            author { login }
            state
            submittedAt
          }
        }
      }
    }
  }
}
"""

MEMBERS_QUERY = """
query GetOrgMembers($org: String!, $cursor: String) {
  organization(login: $org) {
    membersWithRole(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        login
        name
        avatarUrl
      }
    }
  }
}
"""


def get_headers() -> dict[str, str]:
    token = get_settings().github_token
    if not token:
        raise ValueError("GITHUB_TOKEN required. Set in .env or environment.")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def fetch_prs_page(
    client: httpx.Client,
    owner: str,
    name: str,
    cursor: str | None = None,
) -> dict:
    variables = {"owner": owner, "name": name, "cursor": cursor}
    resp = client.post(
        "https://api.github.com/graphql",
        json={"query": PRS_QUERY, "variables": variables},
        headers=get_headers(),
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL errors: {data['errors']}")
    return data["data"]["repository"]["pullRequests"]


def fetch_all_merged_prs(
    owner: str,
    name: str,
    days_lookback: int,
    *,
    on_progress: Callable[[int], None] | None = None,
) -> list[dict]:
    """Paginate until all merged PRs from the last days_lookback days are fetched. Cursor-based."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_lookback)).isoformat()
    all_nodes: list[dict] = []
    cursor: str | None = None

    with httpx.Client() as client:
        while True:
            pr_data = fetch_prs_page(client, owner, name, cursor)
            nodes = pr_data.get("nodes") or []
            for n in nodes:
                merged_at = n.get("mergedAt")
                if merged_at and merged_at < cutoff:
                    if on_progress:
                        on_progress(len(all_nodes))
                    return all_nodes
                # Normalize to requested shape: number, title, body, createdAt, mergedAt, author, files, reviews
                pr = {
                    "number": n.get("number"),
                    "title": n.get("title") or "",
                    "body": n.get("body") or "",
                    "createdAt": n.get("createdAt"),
                    "mergedAt": n.get("mergedAt"),
                    "additions": n.get("additions") or 0,
                    "deletions": n.get("deletions") or 0,
                }
                if n.get("author"):
                    pr["author"] = {"login": n["author"].get("login") or ""}
                else:
                    pr["author"] = {"login": ""}
                files = n.get("files", {}).get("nodes") or []
                pr["files"] = [{"path": f.get("path", ""), "additions": f.get("additions", 0), "deletions": f.get("deletions", 0)} for f in files]
                # Reviews: score script expects list or { nodes: [...] }
                reviews_data = n.get("reviews") or {}
                review_nodes = reviews_data.get("nodes") if isinstance(reviews_data, dict) else (reviews_data if isinstance(reviews_data, list) else [])
                pr["reviews"] = [{"author": r.get("author") or {}, "state": r.get("state") or "COMMENTED", "submittedAt": r.get("submittedAt") or ""} for r in review_nodes] if isinstance(review_nodes, list) else []
                all_nodes.append(pr)

            if on_progress:
                on_progress(len(all_nodes))
            if not pr_data.get("pageInfo", {}).get("hasNextPage"):
                break
            cursor = pr_data["pageInfo"].get("endCursor")

    return all_nodes


def fetch_org_members(org: str) -> list[dict]:
    """Fetch org members with login, name, avatarUrl. GraphQL cursor-based pagination."""
    all_nodes: list[dict] = []
    cursor: str | None = None

    with httpx.Client() as client:
        while True:
            variables = {"org": org, "cursor": cursor}
            resp = client.post(
                "https://api.github.com/graphql",
                json={"query": MEMBERS_QUERY, "variables": variables},
                headers=get_headers(),
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                raise RuntimeError(f"GraphQL errors: {data['errors']}")
            conn = data["data"]["organization"]["membersWithRole"]
            nodes = conn.get("nodes") or []
            for n in nodes:
                all_nodes.append({
                    "login": n.get("login") or "",
                    "name": n.get("name") or "",
                    "avatarUrl": n.get("avatarUrl") or "",
                })
            if not conn.get("pageInfo", {}).get("hasNextPage"):
                break
            cursor = conn["pageInfo"].get("endCursor")

    return all_nodes

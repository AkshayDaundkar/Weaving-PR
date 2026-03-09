#!/usr/bin/env python3
"""Fetch merged PRs and org members from GitHub GraphQL. Save to data/raw/prs.json and data/raw/members.json."""

import json
import sys
from pathlib import Path

# Ensure backend is on path when run from repo root or backend/
BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.config import get_settings
from scripts.utils.github import fetch_all_merged_prs, fetch_org_members


def main() -> None:
    settings = get_settings()
    settings.raw_path.mkdir(parents=True, exist_ok=True)

    def progress(count: int) -> None:
        print(f"  {count} PRs fetched", flush=True)

    print(f"Fetching merged PRs ({settings.github_org}/{settings.github_repo}, last {settings.days_lookback} days)...")
    prs = fetch_all_merged_prs(
        owner=settings.github_org,
        name=settings.github_repo,
        days_lookback=settings.days_lookback,
        on_progress=progress,
    )
    print(f"  {len(prs)} PRs fetched")

    prs_file = settings.raw_path / "prs.json"
    with open(prs_file, "w", encoding="utf-8") as f:
        json.dump(prs, f, indent=2, default=str)
    print(f"Wrote {prs_file}")

    print(f"Fetching org members ({settings.github_org})...")
    members = fetch_org_members(org=settings.github_org)
    members_file = settings.raw_path / "members.json"
    with open(members_file, "w", encoding="utf-8") as f:
        json.dump(members, f, indent=2, default=str)
    print(f"Wrote {members_file} ({len(members)} members)")


if __name__ == "__main__":
    main()

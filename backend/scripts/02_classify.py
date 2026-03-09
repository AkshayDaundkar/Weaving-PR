#!/usr/bin/env python3
"""Classify PRs with work_type, complexity, product_area. Prefer OpenAI (batched), fallback Anthropic.
   Cache in data/processed/llm_cache.json keyed by PR number. No API key → heuristic from title/files."""

import json
import re
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.core.config import get_settings

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import anthropic
except ImportError:
    anthropic = None

# Allowed enums; invalid values fallback to chore / moderate / other
WORK_TYPES = {"feature", "bugfix", "refactor", "infra", "test", "docs", "chore"}
COMPLEXITIES = {"trivial", "moderate", "significant", "architectural"}
PRODUCT_AREAS = {
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


def _normalize(result: dict) -> dict:
    """Ensure work_type, complexity, product_area are in allowed sets; fallback chore/moderate/other."""
    work = (result.get("work_type") or "chore").lower().strip()
    work = work if work in WORK_TYPES else "chore"
    comp = (result.get("complexity") or "moderate").lower().strip()
    comp = comp if comp in COMPLEXITIES else "moderate"
    area = (result.get("product_area") or "other").lower().strip().replace(" ", "_")
    area = area if area in PRODUCT_AREAS else "other"
    return {"work_type": work, "complexity": comp, "product_area": area}


def _get_files_list(pr: dict, max_files: int = 15) -> list[str]:
    """Return list of file paths from pr['files'] (list or dict with nodes)."""
    files = pr.get("files") or []
    if isinstance(files, dict):
        files = files.get("nodes") or []
    return [str(f.get("path") or "") for f in files[:max_files] if isinstance(f, dict)]


def _pr_summary(pr: dict, index: int) -> str:
    """Short summary for one PR in a batch prompt."""
    num = pr.get("number", 0)
    title = (pr.get("title") or "")[:120]
    body = (pr.get("body") or "")[:400].replace("\n", " ")
    file_list = ", ".join(_get_files_list(pr))
    return f"PR {index + 1} (number:{num}) Title: {title} Description: {body} Files: {file_list}"


def _heuristic_classify(pr: dict) -> dict:
    """Classify from title and file paths when no API key. Fallback to chore/moderate/other."""
    title = (pr.get("title") or "").lower()
    paths = _get_files_list(pr, max_files=50)
    path_str = " ".join(paths).lower()

    # work_type from title prefix / keywords
    if title.startswith("fix(") or title.startswith("fix:") or "bug" in title or "fix" in title:
        work = "bugfix"
    elif title.startswith("feat(") or title.startswith("feat:") or "feature" in title:
        work = "feature"
    elif "refactor" in title:
        work = "refactor"
    elif any(x in path_str for x in ["/dags/", "docker", "ci/", ".github/", "terraform"]):
        work = "infra"
    elif any(x in path_str for x in [".test.", "test_", "/tests/", "spec.", "__tests__"]):
        work = "test"
    elif any(x in path_str for x in [".md", "docs/", "readme", "changelog"]) or "doc" in title:
        work = "docs"
    else:
        work = "chore"

    # complexity from additions+deletions and file count
    add = pr.get("additions") or 0
    dele = pr.get("deletions") or 0
    total_lines = add + dele
    n_files = len(paths)
    if total_lines >= 1000 or n_files >= 20:
        comp = "architectural"
    elif total_lines >= 300 or n_files >= 5:
        comp = "significant"
    elif total_lines < 50 and n_files <= 1:
        comp = "trivial"
    else:
        comp = "moderate"

    # product_area from paths
    if any("session_replay" in p or "replay" in p for p in paths):
        area = "session_replay"
    elif any("feature_flag" in p for p in paths):
        area = "feature_flags"
    elif any("survey" in p for p in paths):
        area = "surveys"
    elif any("data_warehouse" in p or "warehouse" in p for p in paths):
        area = "data_warehouse"
    elif any("error_tracking" in p or "error_track" in p for p in paths):
        area = "error_tracking"
    elif any("ingestion" in p for p in paths):
        area = "ingestion"
    elif any("analytics" in p or "insights" in p or "hogql" in p for p in paths):
        area = "analytics"
    elif any("frontend" in p and "test" not in p for p in paths):
        area = "frontend_core"
    elif any(
        x in path_str for x in ["/dags/", "terraform", "docker", "k8s", "infra", "ci/"]
    ):
        area = "infrastructure"
    else:
        area = "other"

    return _normalize({"work_type": work, "complexity": comp, "product_area": area})


def classify_batch_openai(
    client: "OpenAI", pr_batch: list[dict], model: str
) -> list[dict]:
    """One OpenAI call for a batch of PRs; return list of normalized classifications in same order."""
    if not pr_batch:
        return []

    prompt = """Classify each GitHub pull request below. Return a JSON array with one object per PR in the same order.
Each object must have exactly: "work_type", "complexity", "product_area".

work_type: one of feature, bugfix, refactor, infra, test, docs, chore
complexity: one of trivial, moderate, significant, architectural
  (trivial: <50 lines/single file; moderate: 50-300; significant: 300-1000/multi-file; architectural: >1000 or major design)
product_area: one of analytics, session_replay, feature_flags, surveys, data_warehouse, error_tracking, ingestion, frontend_core, infrastructure, other

Output only the JSON array, no markdown or explanation.

"""
    for i, pr in enumerate(pr_batch):
        prompt += _pr_summary(pr, i) + "\n\n"

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=min(4000, 150 * len(pr_batch)),
    )
    text = (response.choices[0].message.content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()
    start = text.find("[")
    end = text.rfind("]") + 1
    if start < 0 or end <= start:
        return [_normalize({}) for _ in pr_batch]
    try:
        raw_list = json.loads(text[start:end])
    except json.JSONDecodeError:
        return [_normalize({}) for _ in pr_batch]
    out = []
    for i, pr in enumerate(pr_batch):
        if i < len(raw_list) and isinstance(raw_list[i], dict):
            out.append(_normalize(raw_list[i]))
        else:
            out.append(_normalize({}))
    return out


def classify_pr_anthropic(
    client: "anthropic.Anthropic", pr: dict, model: str
) -> dict:
    """Single-PR classification with Anthropic (no batching)."""
    title = pr.get("title") or ""
    body = (pr.get("body") or "")[:600]
    file_list = ", ".join(_get_files_list(pr, max_files=25))
    prompt = f"""Analyze this GitHub pull request and return JSON classification.

Title: {title}
Description: {body}
Changed files (sample): {file_list}

Return this exact JSON (no other text):
{{
  "work_type": "feature|bugfix|refactor|infra|test|docs|chore",
  "complexity": "trivial|moderate|significant|architectural",
  "product_area": "analytics|session_replay|feature_flags|surveys|data_warehouse|error_tracking|ingestion|frontend_core|infrastructure|other"
}}

Definitions:
- trivial: < 50 effective lines, single file or config change
- moderate: focused change, 50-300 lines, clear scope
- significant: multi-file feature or fix, 300-1000 lines
- architectural: new system, cross-cutting, > 1000 lines OR major design change"""

    response = client.messages.create(
        model=model,
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return _normalize(json.loads(text[start:end]))
    return _normalize({})


def main() -> None:
    settings = get_settings()
    processed_path = settings.processed_path
    processed_path.mkdir(parents=True, exist_ok=True)

    prs_file = settings.raw_path / "prs.json"
    if not prs_file.exists():
        print("Run 01_collect.py first.")
        sys.exit(1)

    with open(prs_file, encoding="utf-8") as f:
        prs = json.load(f)

    cache_file = processed_path / "llm_cache.json"
    if cache_file.exists():
        with open(cache_file, encoding="utf-8") as f:
            cache = json.load(f)
    else:
        cache = {}

    openai_key = settings.openai_api_key
    anthropic_key = settings.anthropic_api_key
    provider = (settings.llm_provider or "openai").lower()

    if not openai_key and not anthropic_key:
        print("No OPENAI_API_KEY or ANTHROPIC_API_KEY set. Using heuristic from title/files.")
        for pr in prs:
            num = pr.get("number")
            if num is not None and num not in cache:
                cache[num] = _heuristic_classify(pr)
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
        print(f"Wrote {cache_file} ({len(cache)} PRs, heuristic)")
        return

    todo = [p for p in prs if p.get("number") is not None and p["number"] not in cache]
    print(f"Classifying {len(todo)} PRs (cached: {len(prs) - len(todo)})...")

    if openai_key and (provider == "openai" or not anthropic_key):
        # Prefer OpenAI with batching
        client = OpenAI(api_key=openai_key)
        model = settings.llm_model_classify or "gpt-4o-mini"
        batch_size = max(1, min(50, getattr(settings, "llm_batch_size", 25)))
        num_batches = (len(todo) + batch_size - 1) // batch_size
        print(f"Using OpenAI (batched, {batch_size} PRs per call, ~{num_batches} calls)...")

        for b in range(0, len(todo), batch_size):
            batch = todo[b : b + batch_size]
            try:
                results = classify_batch_openai(client, batch, model)
                for pr, result in zip(batch, results):
                    cache[pr["number"]] = result
            except Exception as e:
                print(f"Batch error (PRs {batch[0]['number']}–{batch[-1]['number']}): {e}")
                for pr in batch:
                    cache[pr["number"]] = _normalize({})

            if (b + batch_size) % (5 * batch_size) == 0 or b + batch_size >= len(todo):
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(cache, f, indent=2)
                print(f"  Checkpoint: {min(b + batch_size, len(todo))} / {len(todo)}")
            time.sleep(0.2)

    else:
        # Anthropic fallback (one call per PR)
        client = anthropic.Anthropic(api_key=anthropic_key)
        model = settings.llm_model_classify or "claude-3-5-haiku-20241022"
        print("Using Anthropic (1 call per PR)...")
        for i, pr in enumerate(todo):
            num = pr.get("number")
            try:
                cache[num] = classify_pr_anthropic(client, pr, model)
            except Exception as e:
                print(f"Error PR #{num}: {e}")
                cache[num] = _normalize({})
            if (i + 1) % 20 == 0:
                time.sleep(0.5)
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(cache, f, indent=2)
                print(f"  Checkpoint: {i + 1}")

    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)
    print(f"Wrote {cache_file}")


if __name__ == "__main__":
    main()

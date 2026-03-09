"""Pipeline status and run endpoints: collect, classify, score."""

import json
import subprocess
import sys
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# Backend root (parent of app/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

# One step at a time; "collect" | "classify" | "score" | None
_running_step: str | None = None
_running_lock = threading.Lock()


def _get_status() -> dict:
    settings = get_settings()
    raw_prs = settings.raw_path / "prs.json"
    raw_members = settings.raw_path / "members.json"
    llm_cache = settings.processed_path / "llm_cache.json"
    engineers_file = settings.output_path / "engineers.json"

    pr_count = 0
    if raw_prs.exists():
        try:
            with open(raw_prs, encoding="utf-8") as f:
                data = json.load(f)
            pr_count = len(data) if isinstance(data, list) else 0
        except Exception:
            pass

    classified_count = 0
    if llm_cache.exists():
        try:
            with open(llm_cache, encoding="utf-8") as f:
                data = json.load(f)
            classified_count = len(data) if isinstance(data, dict) else 0
        except Exception:
            pass

    collect_done = raw_prs.exists() and raw_members.exists() and pr_count > 0
    classify_done = llm_cache.exists()
    score_done = engineers_file.exists()

    with _running_lock:
        running = _running_step

    return {
        "collect_done": collect_done,
        "classify_done": classify_done,
        "score_done": score_done,
        "pr_count": pr_count,
        "classified_count": classified_count,
        "running_step": running,
        "days_lookback": settings.days_lookback,
    }


def _run_script(step: str) -> None:
    global _running_step
    script_map = {
        "collect": "scripts/01_collect.py",
        "classify": "scripts/02_classify.py",
        "score": "scripts/03_score.py",
    }
    path = script_map.get(step)
    if not path:
        return
    with _running_lock:
        _running_step = step
    try:
        subprocess.run(
            [sys.executable, path],
            cwd=str(_BACKEND_DIR),
            capture_output=True,
            text=True,
            timeout=3600,
        )
    finally:
        with _running_lock:
            _running_step = None


@router.get("/status")
def pipeline_status() -> dict:
    """Return pipeline state: which steps are done, PR/classified counts, and if a step is running."""
    return _get_status()


@router.post("/run")
def pipeline_run(step: str = "collect") -> dict:
    """Run one pipeline step: collect, classify, or score. Runs in background; returns immediately."""
    if step not in ("collect", "classify", "score"):
        raise HTTPException(status_code=400, detail="step must be collect, classify, or score")
    with _running_lock:
        if _running_step:
            raise HTTPException(
                status_code=409,
                detail=f"Pipeline step '{_running_step}' is already running",
            )
    thread = threading.Thread(target=_run_script, args=(step,), daemon=True)
    thread.start()
    return {"status": "started", "step": step}

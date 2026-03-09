"""Pipeline status and run endpoints: collect, classify, score."""

import json
import subprocess
import sys
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.core.config import get_settings

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# Backend root (parent of app/ and scripts/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent

# One step at a time; "collect" | "classify" | "score" | None
_running_step: str | None = None
_last_run_error: str | None = None
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
        last_err = _last_run_error

    out = {
        "collect_done": collect_done,
        "classify_done": classify_done,
        "score_done": score_done,
        "pr_count": pr_count,
        "classified_count": classified_count,
        "running_step": running,
        "days_lookback": settings.days_lookback,
    }
    if last_err:
        out["last_run_error"] = last_err
    return out


def _run_script(step: str) -> None:
    global _running_step, _last_run_error
    script_map = {
        "collect": "scripts/01_collect.py",
        "classify": "scripts/02_classify.py",
        "score": "scripts/03_score.py",
    }
    script_name = script_map.get(step)
    if not script_name:
        return
    script_path = _BACKEND_DIR / script_name
    with _running_lock:
        _running_step = step
        _last_run_error = None
    try:
        if not script_path.exists():
            with _running_lock:
                _last_run_error = f"Script not found: {script_path}"
            return
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=str(_BACKEND_DIR),
            capture_output=True,
            text=True,
            timeout=3600,
        )
        if result.returncode != 0:
            err = (result.stderr or result.stdout or "").strip() or f"Exit code {result.returncode}"
            with _running_lock:
                _last_run_error = f"{step}: {err[:500]}"
    except subprocess.TimeoutExpired:
        with _running_lock:
            _last_run_error = f"{step}: timed out after 1 hour"
    except Exception as e:
        with _running_lock:
            _last_run_error = f"{step}: {str(e)[:500]}"
    finally:
        with _running_lock:
            _running_step = None


@router.get("/status")
def pipeline_status() -> dict:
    """Return pipeline state: which steps are done, PR/classified counts, and if a step is running."""
    return _get_status()


@router.post("/run")
def pipeline_run(
    step: str = Query("collect", description="Pipeline step: collect, classify, or score"),
) -> dict:
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

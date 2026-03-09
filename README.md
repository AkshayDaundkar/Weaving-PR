# PostHog Engineering Impact Dashboard

Identifies the most impactful engineers at a GitHub org (e.g. PostHog/posthog) using **complexity-weighted PR output**, **review impact**, **velocity**, and **quality**—not raw commit or line counts. Single-page dashboard with leaderboard, engineer detail, insights, and a chat assistant.

## Quick start

### Backend

From the `weaving/backend` directory (or repo root with `backend` on `PYTHONPATH`):

```bash
cd weaving/backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

Create a `.env` file (see `.env.example`):

- **GITHUB_TOKEN** — required for the pipeline (repo + `read:org` scope).
- **OPENAI_API_KEY** — optional; used for PR classification and chat. If unset, classification uses heuristics and chat uses rule-based answers.

Run the data pipeline, then start the API:

```bash
python scripts/01_collect.py    # Fetch PRs and org members from GitHub
python scripts/02_classify.py   # Classify PRs (LLM or heuristic)
python scripts/03_score.py      # Score engineers, write data/output/engineers.json
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd weaving/frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The app rewrites `/api/*` to the backend (port 8000).

---

## Project layout

| Area | Contents |
|------|----------|
| **backend** | FastAPI app, file-based data (no DB). |
| `backend/app/` | API routes, Pydantic models, config, data loader. |
| `backend/scripts/` | Pipeline: `01_collect.py`, `02_classify.py`, `03_score.py`; `utils/` (GitHub, scoring, network, areas). |
| `backend/data/` | `raw/` (prs.json, members.json), `processed/` (llm_cache.json), `output/` (engineers.json). |
| **frontend** | Next.js 14 App Router, TypeScript, Tailwind. |
| `frontend/app/` | Layout, page, globals.css. |
| `frontend/components/` | Dashboard, Leaderboard, DetailPanel, Insights, Chatbot, ThemeToggle. |
| `frontend/lib/` | API client, types. |

---

## How impact is calculated

Impact is a **composite score** (0–100) over qualified engineers (min PRs and min reviews from config):

- **PR complexity output (40%)** — Complexity-weighted merged PRs (file type/size/breadth × LLM complexity: trivial → architectural).
- **Review impact (25%)** — Depth and quality of reviews, weighted by complexity of PRs reviewed.
- **Velocity (20%)** — Median time to first review (inverted so faster = better).
- **Quality (15%)** — Issue-linked PRs, first-pass approval, product-area breadth.

Each dimension is **percentile-ranked** across the cohort, then combined. The dashboard also surfaces **hidden heroes** (high review impact, lower PR count), **rising stars** (strong recent momentum), and a **collaboration network**.

---

## Requirements

- **Python 3.11+**
- **Node 18+**
- **GitHub token** with `repo` and `read:org` (for pipeline). Optional: **OpenAI** (and/or **Anthropic**) API key for LLM classification and chat.

---

## Deploy

- **Backend:** Run `uvicorn main:app --host 0.0.0.0 --port 8000` (or serve `engineers.json` via any static host and point the frontend to an API that reads it).
- **Frontend:** Set **NEXT_PUBLIC_API_URL** to the backend base URL (e.g. `https://api.example.com`). Build with `npm run build` and run or export as needed.

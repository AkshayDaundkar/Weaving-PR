# Engineering Best Practices
## PostHog Impact Dashboard — Next.js + FastAPI Monorepo

> Synthesized from Claude Code Best Practices guide and adapted to our specific stack.
> This is a living document — update it when you discover what goes wrong.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Claude Code Workflow](#2-claude-code-workflow)
3. [Python / FastAPI Backend](#3-python--fastapi-backend)
4. [Next.js Frontend](#4-nextjs-frontend)
5. [Testing Standards](#5-testing-standards)
6. [Git Conventions](#6-git-conventions)
7. [Environment & Configuration](#7-environment--configuration)
8. [What to Avoid](#8-what-to-avoid)

---

## 1. Project Structure

### Monorepo Layout

```
posthog-impact/
│
├── CLAUDE.md                     ← Root-level Claude context (100–200 lines max)
├── best-practices.md             ← This file
├── PLAN.md                       ← Living implementation plan
├── .gitignore
│
├── backend/                      ← Python FastAPI application
│   ├── CLAUDE.md                 ← Backend-specific Claude context (50–100 lines)
│   ├── pyproject.toml            ← Single source of deps + tool config
│   ├── .env.example              ← Document every env var (no values)
│   ├── main.py                   ← FastAPI app entry point (thin — just mounts app)
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/           ← Route handlers (thin — delegate to services)
│   │   │   │   ├── engineers.py
│   │   │   │   ├── stats.py
│   │   │   │   └── network.py
│   │   │   └── deps.py           ← Shared FastAPI dependencies (Depends())
│   │   │
│   │   ├── core/
│   │   │   ├── config.py         ← Pydantic BaseSettings (one source of truth)
│   │   │   └── logging.py        ← Structured logging setup
│   │   │
│   │   ├── models/               ← Pydantic models: request bodies + response shapes
│   │   │   ├── engineer.py
│   │   │   ├── stats.py
│   │   │   └── network.py
│   │   │
│   │   ├── services/             ← Business logic (pure functions where possible)
│   │   │   ├── scoring.py        ← All scoring/impact calculation logic
│   │   │   ├── github.py         ← GitHub GraphQL client
│   │   │   ├── classifier.py     ← Claude API classification logic
│   │   │   └── cache.py          ← Caching layer
│   │   │
│   │   └── data/                 ← Data access layer
│   │       ├── database.py       ← SQLite connection + initialization
│   │       └── repositories/     ← One repo class per entity
│   │           ├── pr_repo.py
│   │           └── engineer_repo.py
│   │
│   ├── scripts/                  ← One-time data pipeline scripts (not part of API)
│   │   ├── 01_collect.py         ← GitHub GraphQL → raw JSON
│   │   ├── 02_classify.py        ← LLM classification + caching
│   │   ├── 03_score.py           ← Scoring engine → engineers.json
│   │   └── utils/
│   │       ├── github.py
│   │       ├── scoring.py
│   │       ├── areas.py
│   │       └── network.py
│   │
│   ├── tests/
│   │   ├── conftest.py           ← Fixtures (test client, mock data)
│   │   ├── unit/
│   │   │   ├── test_scoring.py
│   │   │   └── test_classifier.py
│   │   └── integration/
│   │       └── test_api.py
│   │
│   └── data/
│       ├── raw/                  ← Never committed (gitignored)
│       ├── processed/            ← Never committed (gitignored)
│       └── output/
│           └── engineers.json    ← Committed — this is the final scored dataset
│
├── frontend/                     ← Next.js 14 App Router
│   ├── CLAUDE.md                 ← Frontend-specific Claude context (50–100 lines)
│   ├── package.json
│   ├── tsconfig.json             ← Strict mode on
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── .env.local.example
│   │
│   ├── app/                      ← App Router: Server Components by default
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← Reads engineers.json at build time (RSC)
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                   ← shadcn/ui auto-generated — never edit manually
│   │   ├── Header/
│   │   │   └── Header.tsx
│   │   ├── Leaderboard/
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── EngineerRow.tsx
│   │   │   ├── ImpactBar.tsx
│   │   │   └── MomentumBadge.tsx
│   │   ├── EngineerDetail/
│   │   │   ├── DetailPanel.tsx
│   │   │   ├── ScoreRadar.tsx
│   │   │   ├── WorkBreakdown.tsx
│   │   │   ├── TopPRsList.tsx
│   │   │   └── WeeklySparkline.tsx
│   │   ├── Network/
│   │   │   └── CollaborationGraph.tsx
│   │   ├── Insights/
│   │   │   ├── HiddenHeroes.tsx
│   │   │   └── RisingStars.tsx
│   │   ├── Methodology/
│   │   │   └── MethodologyPanel.tsx
│   │   └── shared/               ← Primitives used everywhere
│   │       ├── MetricTooltip.tsx
│   │       ├── ScoreBadge.tsx
│   │       ├── ComplexityBadge.tsx
│   │       └── Avatar.tsx
│   │
│   ├── hooks/
│   │   ├── useEngineerSelection.ts
│   │   ├── useForceGraph.ts
│   │   └── useAnimatedCounter.ts
│   │
│   ├── lib/
│   │   ├── api.ts                ← ALL API calls go here (single source of truth)
│   │   ├── types.ts              ← ALL TypeScript types (mirrors backend Pydantic models)
│   │   ├── colors.ts             ← Design tokens for product areas + scores
│   │   └── formatters.ts        ← Number/date formatting helpers
│   │
│   └── public/
│       └── engineers.json        ← Copied from backend/data/output/ at build time
│
└── .claude/
    └── commands/                 ← Custom slash commands
        ├── dev-docs.md           ← /dev-docs: Create plan/context/tasks files
        ├── catchup.md            ← /catchup: Read all changed files in branch
        ├── code-review.md        ← /code-review: Architectural review
        └── pr.md                 ← /pr: Clean up + prepare PR
```

### Key Structural Rules

1. **Monorepo = shared context.** Keep backend and frontend in one repo so a single PR can span full stack. The scoring engine output feeds directly into the frontend.

2. **Data flows one direction.** `scripts/ → data/output/ → frontend/public/`. The API layer in `app/api/routes/` reads from the same output. Never write data from routes.

3. **`lib/api.ts` is sacred.** All frontend API calls go through this file. No `fetch()` calls inside components. This is the contract between frontend and backend.

4. **`lib/types.ts` mirrors `models/`.** When you change a Pydantic model in the backend, update `types.ts` in the frontend immediately. They must stay in sync.

---

## 2. Claude Code Workflow

### The Non-Negotiable Loop

```
PLAN → EXPLORE → IMPLEMENT → TEST → COMMIT → CLEAR
```

Never skip PLAN. Never let context fill past 60k tokens.

### CLAUDE.md Structure

**Root `CLAUDE.md`** (100–200 lines, < 2000 tokens):
```markdown
# PostHog Impact Dashboard

## Quick Commands
- Backend: `cd backend && uvicorn main:app --reload`
- Frontend: `cd frontend && npm run dev`
- Run scripts: `cd backend && python scripts/01_collect.py`
- Tests: `cd backend && pytest` / `cd frontend && npm test`

## Architecture
- Monorepo: backend/ (FastAPI) + frontend/ (Next.js 14)
- Data pipeline: scripts/ → data/output/engineers.json → frontend/public/
- API: FastAPI at :8000, Next.js at :3000 proxies /api/* to backend

## What Claude Gets Wrong Here
- Don't add `async def` to non-async functions in services/
- Don't put business logic in route handlers — use services/
- Don't use `useState` in Server Components (they're async, not interactive)
- Don't @-embed entire files — reference paths instead

## Testing
- Backend: `pytest backend/tests/ -v`
- Frontend: `npm test` (vitest)
- Always run tests before committing
```

**`backend/CLAUDE.md`** (50–100 lines):
```markdown
# Backend Context

## Stack
Python 3.12, FastAPI, Pydantic v2, SQLite, httpx (async), pytest

## Patterns
- Route handlers: thin — validate input, call service, return response
- Services: pure business logic, no FastAPI imports
- Repos: all DB queries live here, nowhere else
- Models: one file per entity, separate Request and Response models

## Common Pitfalls
- Always use `async def` in routes and services that do I/O
- Use `httpx.AsyncClient` not `requests` (async context)
- Pydantic v2: use `model_validate()` not `.parse_obj()`
- Config: always access via `get_settings()` dependency, never `os.environ`
```

**`frontend/CLAUDE.md`** (50–100 lines):
```markdown
# Frontend Context

## Stack
Next.js 14 (App Router), TypeScript strict, Tailwind, shadcn/ui, Recharts, D3, Framer Motion

## Server vs Client Components
- Default: Server Component (no "use client")
- Add "use client" ONLY for: useState, useEffect, event handlers, D3, Framer Motion
- Data fetching happens in Server Components, never client-side

## Patterns
- All API calls: lib/api.ts only
- All types: lib/types.ts only — never define inline
- shadcn/ui components in components/ui/ — never edit these files
- "use client" at the leaf level, not parent wrappers

## Common Pitfalls
- Don't import Framer Motion in Server Components — it will crash
- D3 useEffect must check `if (!svgRef.current) return`
- Recharts ResponsiveContainer needs explicit height on parent
```

### Planning Before Every Feature

For any non-trivial task:

```
1. /dev-docs  →  creates plan.md + context.md + tasks.md
2. Review plan — challenge assumptions, ask for alternatives
3. Start fresh context: load plan.md, implement ONE task at a time
4. Mark tasks complete in tasks.md as you go
5. Update plan.md if requirements change mid-implementation
6. /clear between major sections (not between every file)
```

**Three-file pattern** for every feature:
```
.claude/tasks/[feature-name]/
├── plan.md      ← The accepted approach + architecture decisions
├── context.md   ← Key files to read, decisions made, gotchas discovered
└── tasks.md     ← Checkbox list of work items
```

### Context Management Rules

| Trigger | Action |
|---------|--------|
| Context hits 60k tokens | `/clear` + reload plan.md |
| Task complete | Commit, then `/clear` |
| Getting weird results | `/clear` — context is probably polluted |
| Switching between backend and frontend | `/clear` |

- **Never use `/compact`** — it's opaque and loses important decisions
- **Document & Clear pattern**: Before clearing on complex tasks, ask Claude to write current state to `context.md`, then `/clear`, then resume with that file

### Custom Slash Commands

```
/dev-docs          → Create plan.md + context.md + tasks.md for current task
/catchup           → Read all files changed since last commit, summarize state
/code-review       → Architectural review: check for anti-patterns, security issues
/pr                → Clean code, write conventional commit message, prep PR description
```

---

## 3. Python / FastAPI Backend

### Layer Architecture

```
HTTP Request
    ↓
Route Handler (app/api/routes/)     ← Thin: validate, call service, return
    ↓
Service Layer (app/services/)       ← Business logic: pure, testable
    ↓
Repository Layer (app/data/repositories/)   ← DB queries only
    ↓
SQLite / External APIs
```

**Rule**: No business logic in routes. No DB queries in services. No route imports in services.

### Route Handlers — Stay Thin

```python
# ✅ Correct: route is a thin adapter
@router.get("/engineers", response_model=list[EngineerResponse])
async def get_engineers(
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    return await engineer_service.get_top_engineers(db, limit=limit)


# ❌ Wrong: business logic inside route handler
@router.get("/engineers")
async def get_engineers(db: AsyncSession = Depends(get_db)):
    engineers = await db.execute(select(Engineer))
    scored = []
    for e in engineers:
        score = (e.pr_count * 0.4) + (e.review_count * 0.25)  # ← belongs in service
        scored.append({...})
    return sorted(scored, key=lambda x: x['score'], reverse=True)
```

### Pydantic Models — Explicit Shapes

```python
# models/engineer.py

from pydantic import BaseModel, Field

# Separate models for DB row, API response, and API request
class EngineerBase(BaseModel):
    login: str
    avatar_url: str
    github_url: str

class EngineerDimensions(BaseModel):
    pr_output: float = Field(ge=0, le=100)
    review_impact: float = Field(ge=0, le=100)
    velocity: float = Field(ge=0, le=100)
    quality: float = Field(ge=0, le=100)

class EngineerResponse(EngineerBase):
    rank: int
    impact_score: float = Field(ge=0, le=100)
    momentum: float                            # can be negative
    narrative: str
    dimensions: EngineerDimensions
    work_breakdown: dict[str, float]           # percentage per type
    raw_stats: dict[str, int | float]

    model_config = {"from_attributes": True}  # Pydantic v2
```

### Config — One Source of Truth

```python
# app/core/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # GitHub
    github_token: str
    github_org: str = "PostHog"
    github_repo: str = "posthog"

    # Anthropic
    anthropic_api_key: str
    llm_model_classify: str = "claude-haiku-4-5-20251001"
    llm_model_narrative: str = "claude-sonnet-4-6"

    # App
    data_dir: str = "data"
    days_lookback: int = 90
    min_prs_to_qualify: int = 3

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

```python
# In routes — inject via Depends, never use os.environ directly
async def some_route(settings: Settings = Depends(get_settings)):
    client = GitHubClient(token=settings.github_token)
```

### Async Everywhere

```python
# ✅ Correct: async I/O
async def fetch_prs(client: httpx.AsyncClient) -> list[dict]:
    response = await client.post(
        "https://api.github.com/graphql",
        json={"query": QUERY, "variables": {...}},
        headers={"Authorization": f"Bearer {settings.github_token}"},
    )
    response.raise_for_status()
    return response.json()["data"]["repository"]["pullRequests"]["nodes"]


# ❌ Wrong: blocking I/O in async context
async def fetch_prs():
    import requests  # blocks the event loop
    response = requests.post(...)
```

### Error Handling — Explicit, Never Silent

```python
# app/api/routes/engineers.py

from fastapi import HTTPException
from app.services.scoring import ScoringError

@router.get("/engineers/{login}")
async def get_engineer(login: str, db = Depends(get_db)):
    try:
        engineer = await engineer_service.get_by_login(db, login)
    except ScoringError as e:
        # Domain error → 422 with context
        raise HTTPException(status_code=422, detail=str(e))

    if engineer is None:
        raise HTTPException(status_code=404, detail=f"Engineer '{login}' not found")

    return engineer
```

```python
# app/services/scoring.py

class ScoringError(Exception):
    """Raised when scoring computation fails."""
    pass

def compute_impact_score(engineer_data: dict) -> float:
    if not engineer_data.get("prs_merged") and not engineer_data.get("reviews_given"):
        raise ScoringError(f"Engineer {engineer_data['login']} has no activity data")
    # ...
```

### Services — Pure and Testable

```python
# ✅ Services take data in, return data out — no side effects, no HTTP
# This makes them easy to unit test

def compute_pr_output_score(
    merged_prs: list[PRData],
    all_engineer_pr_outputs: list[float],  # for percentile ranking
) -> tuple[float, PROutputRaw]:
    raw_output = sum(pr.complexity_score for pr in merged_prs)
    score = percentile_rank(raw_output, all_engineer_pr_outputs)
    raw = PROutputRaw(
        total_complexity=raw_output,
        prs_merged=len(merged_prs),
        top_pr=max(merged_prs, key=lambda p: p.complexity_score, default=None),
    )
    return score, raw
```

### Type Hints — Always

```python
# ✅
def classify_pr(title: str, body: str, file_paths: list[str]) -> PRClassification:
    ...

# ❌
def classify_pr(title, body, files):
    ...
```

Run `mypy` in strict mode. Zero type errors before commit.

---

## 4. Next.js Frontend

### Server vs Client Components — The Critical Distinction

```
Server Component (default)     Client Component ("use client")
─────────────────────────────  ─────────────────────────────
Runs on server at build time   Runs in browser
Can be async                   Cannot be async
No useState/useEffect          Can use hooks
No event handlers              Can use event handlers
Smaller JS bundle              Adds to JS bundle
Fast initial render            Interactive
```

**Rule**: Push `"use client"` to the **leaf level**. The further down the tree, the better.

```tsx
// ✅ Parent is Server Component — reads data, passes it down
// app/page.tsx (Server Component)
import engineersData from "../public/engineers.json"
import { Leaderboard } from "@/components/Leaderboard/Leaderboard"

export default function Page() {
  return <Leaderboard engineers={engineersData.top5} />
}

// ✅ Leaderboard is also a Server Component — no interactivity needed
// components/Leaderboard/Leaderboard.tsx (Server Component — no "use client")
export function Leaderboard({ engineers }: { engineers: Engineer[] }) {
  return (
    <div>
      {engineers.map((e, i) => (
        <EngineerRow key={e.login} engineer={e} rank={i + 1} />
      ))}
    </div>
  )
}

// ✅ Only the interactive row needs "use client"
// components/Leaderboard/EngineerRow.tsx
"use client"
import { motion } from "framer-motion"

export function EngineerRow({ engineer, rank }: Props) {
  // Framer Motion requires "use client"
  return <motion.div ...>...</motion.div>
}
```

### API Layer — Always Through `lib/api.ts`

```typescript
// lib/api.ts — the ONLY place fetch() is called

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export async function getEngineers(): Promise<Engineer[]> {
  const res = await fetch(`${API_BASE}/api/engineers`, {
    next: { revalidate: 3600 },  // ISR: cache for 1 hour
  })
  if (!res.ok) throw new Error(`Failed to fetch engineers: ${res.status}`)
  return res.json()
}

export async function getEngineerDetail(login: string): Promise<Engineer> {
  const res = await fetch(`${API_BASE}/api/engineers/${login}`)
  if (!res.ok) throw new Error(`Engineer ${login} not found`)
  return res.json()
}

export async function getNetworkData(): Promise<NetworkData> {
  const res = await fetch(`${API_BASE}/api/network`)
  if (!res.ok) throw new Error("Failed to fetch network data")
  return res.json()
}
```

```tsx
// ✅ In Server Component — call api.ts functions directly (they're async)
// app/page.tsx
import { getEngineers } from "@/lib/api"

export default async function Page() {
  const engineers = await getEngineers()  // runs at build time
  return <Dashboard engineers={engineers} />
}

// ❌ Never do this — fetch inside a component
export default function Page() {
  const [data, setData] = useState(null)
  useEffect(() => { fetch("/api/engineers").then(...) }, [])  // wrong
}
```

### Types — Single Source of Truth

```typescript
// lib/types.ts — mirrors backend Pydantic models exactly

export interface EngineerDimensions {
  pr_output: number      // 0–100
  review_impact: number  // 0–100
  velocity: number       // 0–100
  quality: number        // 0–100
}

export interface Engineer {
  login: string
  avatar_url: string
  github_url: string
  rank: number
  impact_score: number   // 0–100
  momentum: number       // percent, can be negative
  narrative: string
  dimensions: EngineerDimensions
  work_breakdown: Record<string, number>  // percentage per work type
  area_breakdown: Record<string, number>
  primary_area: string
  top_prs: TopPR[]
  weekly_impact: number[]   // 13 values for sparkline
  raw_stats: RawStats
}

// Rule: never define types inline in components
// ❌ const Engineer: { login: string, score: number } = ...
// ✅ import type { Engineer } from "@/lib/types"
```

### Component Conventions

```tsx
// ✅ Named exports (not default) for all components except page.tsx
export function EngineerRow({ engineer, rank }: EngineerRowProps) { ... }

// ✅ Props interface defined in same file, exported for reuse
export interface EngineerRowProps {
  engineer: Engineer
  rank: number
  isSelected?: boolean
  onSelect?: (login: string) => void
}

// ✅ One component per file, filename matches component name
// components/Leaderboard/EngineerRow.tsx → export function EngineerRow

// ❌ Multiple components in one file (except tiny sub-components)
// ❌ Default exports for non-page components
```

### Custom Hooks — Isolate Complex Logic

```typescript
// hooks/useEngineerSelection.ts
"use client"

import { useState, useCallback } from "react"
import type { Engineer } from "@/lib/types"

export function useEngineerSelection(engineers: Engineer[]) {
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null)

  const selectedEngineer = engineers.find(e => e.login === selectedLogin) ?? null

  const selectEngineer = useCallback((login: string) => {
    setSelectedLogin(prev => prev === login ? null : login)  // toggle
  }, [])

  const clearSelection = useCallback(() => setSelectedLogin(null), [])

  return { selectedEngineer, selectEngineer, clearSelection }
}

// Usage in component:
// const { selectedEngineer, selectEngineer } = useEngineerSelection(engineers)
```

### D3 in React — Always in useEffect

```typescript
// hooks/useForceGraph.ts
"use client"

import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { NetworkData } from "@/lib/types"

export function useForceGraph(
  svgRef: React.RefObject<SVGSVGElement>,
  data: NetworkData,
  onNodeClick: (login: string) => void,
) {
  useEffect(() => {
    if (!svgRef.current) return            // ← always guard
    if (!data.nodes.length) return         // ← always guard empty data

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()            // ← always clean up on re-render

    const simulation = d3.forceSimulation(data.nodes)
      // ... setup ...

    return () => {
      simulation.stop()                    // ← always cleanup on unmount
      svg.selectAll("*").remove()
    }
  }, [data, onNodeClick])                  // ← correct dependency array
}
```

### Framer Motion Conventions

```tsx
// Define variants outside component (not inside — prevents recreation each render)
const rowVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.25, ease: "easeOut" },
  }),
}

export function EngineerRow({ engineer, rank }: EngineerRowProps) {
  return (
    <motion.div
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      custom={rank}              // passes rank to variant function
      exit={{ opacity: 0, x: 16 }}
    >
      ...
    </motion.div>
  )
}
```

---

## 5. Testing Standards

### Backend — pytest

**Naming**:
- Unit tests: `tests/unit/test_<module>.py`
- Integration tests: `tests/integration/test_<feature>.py`
- Fixtures: `tests/conftest.py`

**Pattern**:
```python
# tests/unit/test_scoring.py

import pytest
from app.services.scoring import compute_pr_output_score, percentile_rank

class TestPercentileRank:
    def test_median_value_returns_50(self):
        values = [10, 20, 30, 40, 50]
        assert percentile_rank(30, values) == pytest.approx(60.0)

    def test_max_value_returns_100(self):
        values = [10, 20, 30]
        assert percentile_rank(30, values) == 100.0

    def test_single_value_list(self):
        assert percentile_rank(5, [5]) == 100.0

class TestComputePROutputScore:
    def test_empty_prs_returns_zero(self, mock_all_outputs):
        score, raw = compute_pr_output_score([], mock_all_outputs)
        assert score == 0.0
        assert raw.prs_merged == 0

    def test_score_increases_with_complexity(self, sample_prs, all_outputs):
        low_score, _ = compute_pr_output_score(sample_prs[:1], all_outputs)
        high_score, _ = compute_pr_output_score(sample_prs, all_outputs)
        assert high_score > low_score
```

**Rules**:
1. Write tests BEFORE implementation (TDD)
2. Commit tests separately from implementation
3. Never modify tests to make them pass — fix the code
4. Every test must be able to fail for a real defect
5. Use descriptive names: `test_<what>_when_<condition>_returns_<expected>`
6. No magic numbers — use named variables or fixtures

### Frontend — Vitest

```typescript
// components/Leaderboard/EngineerRow.test.tsx

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EngineerRow } from "./EngineerRow"
import { mockEngineer } from "@/tests/fixtures"

describe("EngineerRow", () => {
  it("displays engineer login and impact score", () => {
    render(<EngineerRow engineer={mockEngineer} rank={1} />)
    expect(screen.getByText(mockEngineer.login)).toBeInTheDocument()
    expect(screen.getByText("87.3")).toBeInTheDocument()
  })

  it("calls onSelect with login when clicked", async () => {
    const onSelect = vi.fn()
    render(<EngineerRow engineer={mockEngineer} rank={1} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole("button"))
    expect(onSelect).toHaveBeenCalledWith(mockEngineer.login)
  })

  it("shows selected state when isSelected is true", () => {
    render(<EngineerRow engineer={mockEngineer} rank={1} isSelected />)
    expect(screen.getByRole("button")).toHaveAttribute("aria-selected", "true")
  })
})
```

---

## 6. Git Conventions

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <imperative short description>

[optional body: what changed and why, not how]
[optional footer: breaking changes, issue refs]
```

**Types**:
| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructure, no behavior change |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build, deps, config |
| `perf` | Performance improvement |

**Scopes for this project**: `backend`, `frontend`, `scripts`, `scoring`, `api`, `network`, `ui`

**Examples**:
```
feat(scoring): add LLM complexity multiplier to PR output dimension
fix(api): handle engineers with no reviews in velocity calculation
test(scoring): add edge cases for percentile rank with single-value list
feat(frontend): add collaboration network D3 force graph
chore(deps): upgrade to Pydantic v2
```

### Rules

1. **Every commit must compile and pass tests.** If it doesn't, it goes in a WIP branch.
2. **Commit tests separately from implementation.** Two commits: `test(scoring): add tests` then `feat(scoring): implement`.
3. **Never commit**: `.env`, `data/raw/`, `data/processed/`, `__pycache__/`, `node_modules/`, `.next/`
4. **Small commits beat big commits.** One logical change per commit.
5. **No "WIP", "fix", "stuff" messages.** If you can't describe it, break it up.

### Branch Naming

```
feature/<short-description>   → feature/scoring-engine
fix/<issue-description>       → fix/velocity-zero-division
data/<collection-run>         → data/90day-collection-mar-2026
```

---

## 7. Environment & Configuration

### `.env.example` — Document Everything

```bash
# backend/.env.example

# GitHub API (required)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx   # Personal access token, needs: repo, read:org

# Anthropic API (required)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx       # For PR classification + narrative generation

# App Config (optional — defaults shown)
DATA_DIR=data                           # Where to store collected data
DAYS_LOOKBACK=90                        # Number of days to analyze
MIN_PRS_TO_QUALIFY=3                    # Minimum merged PRs to appear in rankings

# Server (optional)
HOST=0.0.0.0
PORT=8000
```

### Access Config Only Through Settings

```python
# ✅ Always through Pydantic Settings
from app.core.config import get_settings
settings = get_settings()
token = settings.github_token

# ❌ Never directly
import os
token = os.environ["GITHUB_TOKEN"]  # not validated, not typed
```

### Frontend Environment

```bash
# frontend/.env.local.example
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend URL (prefix NEXT_PUBLIC_ for browser)
```

---

## 8. What to Avoid

### Code Anti-Patterns

```python
# ❌ Business logic in route handlers
# ❌ DB queries in service layer
# ❌ Synchronous I/O in async functions (use httpx not requests)
# ❌ Bare except: (always catch specific exception types)
# ❌ Mutable default arguments: def fn(data=[])
# ❌ String formatting in SQL (use parameterized queries)
# ❌ Missing type hints on function signatures
```

```typescript
// ❌ fetch() inside React components
// ❌ "use client" on parent layouts (pushes all children to client bundle)
// ❌ Defining types inline instead of importing from lib/types.ts
// ❌ Direct DOM manipulation outside useEffect
// ❌ D3 selections outside useEffect (will fail on SSR)
// ❌ Importing Framer Motion in Server Components
// ❌ Default exports on non-page components
```

### Workflow Anti-Patterns

```
# ❌ Starting to code before a plan exists
# ❌ Letting context fill past 60k tokens (quality degrades)
# ❌ Using /compact (opaque, loses decisions)
# ❌ Auto-formatting hooks (consumes 160k tokens in 3 rounds)
# ❌ Skipping manual code review of AI output ("I'm responsible for this code")
# ❌ Heavy MCP usage (>20k tokens kills context)
# ❌ Complex multi-agent pipelines (debuggability > cleverness)
# ❌ Vague instructions ("add a settings page" → specify exactly what it needs)
```

### Dependency Anti-Patterns

```
# ❌ requests (blocking) → use httpx
# ❌ python-dotenv loaded manually → use pydantic-settings
# ❌ print() for logging → use logging module (structured)
# ❌ datetime.now() without timezone → use datetime.now(UTC)
# ❌ assert statements in production code → raise proper exceptions
```

---

## Quick Reference

### Start a new feature

```bash
# 1. Plan first
# → /dev-docs → review → approve

# 2. Backend
cd backend
python -m pytest tests/ -v                   # ensure baseline passes
# implement → pytest → commit

# 3. Frontend
cd frontend
npm test                                     # ensure baseline passes
# implement → npm test → commit

# 4. Validate end-to-end
cd backend && uvicorn main:app --reload &
cd frontend && npm run dev
# Test in browser at localhost:3000
```

### Check types before committing

```bash
# Backend
cd backend && mypy app/ --strict

# Frontend
cd frontend && npx tsc --noEmit
```

### Measuring Success

| Metric | Target |
|--------|--------|
| Baseline Claude context | < 20k tokens |
| CLAUDE.md size | < 2000 tokens total across all files |
| Test coverage (backend) | > 80% for services/ |
| TypeScript errors | 0 before any commit |
| Load time (dashboard) | < 5s cold, < 1s warm |
| PR review iterations | 1–3 per PR |

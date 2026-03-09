"""Chat: questions about impact methodology and rankings. LLM with methodology + optional engineer context, or rule-based fallback."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.data_loader import get_engineer_by_login

router = APIRouter(prefix="/api", tags=["chat"])

METHODOLOGY = """
Impact is defined across four dimensions, all percentile-ranked (0-100) across the team:

1. **PR complexity output (40%)** — Sum of complexity per merged PR: file-type weights, size, breadth × LLM-assigned complexity. So 10 small config tweaks count less than 1 large feature.

2. **Review impact (25%)** — Depth of reviews (approve/comment + comment length) weighted by the complexity of the PRs they reviewed. Reviewing hard PRs counts more.

3. **Velocity (20%)** — How quickly this engineer gives the first review (median time to first review). Faster first review unblocks the team.

4. **Quality (15%)** — Issue-linked PRs, first-pass approval rate, product-area breadth.

**What we exclude:** Raw line counts, commit count, and PR count alone. We cannot measure from GitHub: RFC/design docs, pair programming, mentoring.

**Momentum** = recent vs early period impact (positive = improving). **Rising stars** = strong momentum, not already in top 5. **Hidden heroes** = high review impact but lower PR count — multiplier work often missed by commit counters.
"""


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    selected_engineer: str | None = Field(default=None, description="GitHub login if asking about a specific engineer")


class ChatResponse(BaseModel):
    answer: str


def _build_engineer_context(login: str) -> str:
    engineer = get_engineer_by_login(login)
    if not engineer:
        return ""
    d = engineer.dimensions
    r = engineer.raw_stats
    return f"""
Current selected engineer: **{engineer.login}**
- Rank: #{engineer.rank} | Impact score: {engineer.impact_score:.1f}
- Dimensions (percentile): PR output {d.pr_output:.0f}, Review impact {d.review_impact:.0f}, Velocity {d.velocity:.0f}, Quality {d.quality:.0f}
- Raw: {r.get('prs_merged', 0)} PRs merged, {r.get('reviews_given', 0)} reviews, median time to first review {r.get('median_review_time_hours', 0):.1f}h, first-pass approved {r.get('first_pass_approved_prs', 0)}, issue-linked {r.get('issue_linked_prs', 0)}
- Momentum: {engineer.momentum}%
- Narrative: {engineer.narrative}
"""


def _answer_with_llm(question: str, context: str) -> str | None:
    settings = get_settings()
    system = (
        "You are a helpful assistant for the Engineering Impact Dashboard. "
        "Answer questions about how impact is calculated and why engineers are ranked as they are. "
        "Use ONLY the methodology below. Be concise and clear. If context about a specific engineer is provided, use it to explain their ranking."
        "\n\n" + METHODOLOGY + context
    )
    if settings.openai_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)
            r = client.chat.completions.create(
                model=settings.llm_model_classify or "gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": question},
                ],
                max_tokens=500,
            )
            return (r.choices[0].message.content or "").strip()
        except Exception:
            return None
    if settings.anthropic_api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            m = client.messages.create(
                model=settings.llm_model_classify or "claude-3-5-haiku-20241022",
                max_tokens=500,
                system=system,
                messages=[{"role": "user", "content": question}],
            )
            return (m.content[0].text if m.content else "").strip()
        except Exception:
            return None
    return None


def _answer_fallback(question: str, selected_engineer: str | None) -> str:
    q = question.lower()
    if "how" in q and ("rank" in q or "score" in q or "calculated" in q or "impact" in q):
        return (
            "Impact is a weighted combination of four dimensions: PR complexity output (40%), "
            "review impact (25%), velocity (20%), and quality (15%). Each dimension is a percentile (0–100) vs the team. "
            "See the methodology section on the dashboard for the full breakdown."
        )
    if "why" in q and ("top" in q or "rank" in q or "high" in q or "low" in q):
        return (
            "Ranking comes from the four dimensions. Someone in the top 5 typically has strong PR output and/or "
            "review impact, plus good velocity (fast first reviews) and quality (issue-linked PRs, first-pass approval). "
            "Click an engineer to see their dimension breakdown and raw stats."
        )
    if "velocity" in q or "fast" in q:
        return "Velocity (20% of impact) is how quickly this engineer gives the first review on PRs. Lower median time to first review = higher velocity score (percentile). It reflects how much they unblock the team."
    if "review" in q and "impact" in q:
        return "Review impact (25%) measures depth of reviews (approve/comment + comment length) weighted by the complexity of the PRs they reviewed. Reviewing harder PRs counts more than reviewing many small ones."
    if "quality" in q or "first-pass" in q:
        return "Quality (15%) includes issue-linked PRs, first-pass approval rate, and product-area breadth. It rewards reliable, traceable work."
    if "momentum" in q or "rising" in q:
        return "Momentum is recent vs early period impact (positive = improving). Rising stars are engineers with strong momentum who aren't already in the top 5."
    if "hidden" in q or "hero" in q:
        return "Hidden heroes have high review impact but lower PR count — they do multiplier work (reviews) that doesn't show up in commit counts."
    return (
        "I can explain how impact is calculated and why engineers are ranked as they are. "
        "Try asking: «How is impact calculated?», «Why is [engineer] ranked there?», or «What is velocity?»"
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Answer questions about impact methodology and rankings. Uses LLM if API key set, else rule-based fallback."""
    settings = get_settings()
    context = ""
    if request.selected_engineer:
        context = _build_engineer_context(request.selected_engineer)

    answer: str | None = None
    if settings.openai_api_key or settings.anthropic_api_key:
        answer = _answer_with_llm(request.question, context)

    if answer is None or not answer.strip():
        answer = _answer_fallback(request.question, request.selected_engineer)

    return ChatResponse(answer=answer)

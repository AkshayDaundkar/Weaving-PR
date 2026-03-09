"use client";

import type { TeamStats, DashboardMeta } from "@/lib/types";
import { formatNumber } from "@/lib/formatters";

interface HeroMetricCardProps {
  meta: DashboardMeta;
  teamStats: TeamStats;
  avgImpact?: number;
}

export function HeroMetricCard({ meta, teamStats, avgImpact }: HeroMetricCardProps) {
  const prsPerWeek =
    meta.total_prs_analyzed > 0 && teamStats.total_prs_merged > 0 && teamStats.period_days > 0
      ? (teamStats.total_prs_merged / (teamStats.period_days / 7)).toFixed(1)
      : "—";
  const avg = avgImpact ?? teamStats.avg_impact_score ?? 0;
  const periodLabel =
    meta.date_from && meta.date_to
      ? `${meta.date_from} – ${meta.date_to}`
      : teamStats.period_days
        ? `${teamStats.period_days} days`
        : "—";

  return (
    <div className="card-weave overflow-hidden">
      <div className="px-5 py-4 border-b border-bg-border flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Average output per engineer
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Impact score (0–100) and PR volume. Period: {periodLabel}.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-accent tabular-nums">
            {avg > 0 ? avg.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">impact score</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
            {prsPerWeek}/week
          </p>
          <p className="text-xs text-[var(--text-muted)]">PRs merged (team)</p>
        </div>
      </div>
      <div className="px-5 py-3 bg-bg-tertiary/50 flex flex-wrap gap-4 text-sm">
        <span className="text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{formatNumber(teamStats.total_prs_merged)}</strong> PRs merged
        </span>
        <span className="text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{formatNumber(teamStats.total_reviews)}</strong> reviews
        </span>
        <span className="text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{meta.total_engineers}</strong> engineers
        </span>
        <span className="text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{teamStats.first_pass_approval_rate ?? 0}%</strong> first-pass approval
        </span>
      </div>
    </div>
  );
}

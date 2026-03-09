"use client";

import type { DashboardMeta, TeamStats } from "@/lib/types";
import { formatNumber, formatHours } from "@/lib/formatters";
import { getWorkTypeColor } from "@/lib/colors";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  meta: DashboardMeta;
  teamStats: TeamStats;
  /** Optional work breakdown for badges (aggregate from engineers if needed). */
  workBreakdown?: Record<string, number>;
}

export function Header({ meta, teamStats, workBreakdown = {} }: HeaderProps) {
  const totalPRs = teamStats.total_prs_merged || 1;
  const wb = workBreakdown;

  return (
    <header className="border-b border-bg-border bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
              Engineering Impact
            </h1>
            <span className="text-[var(--text-muted)] text-sm ml-1">
              {meta.date_from} – {meta.date_to}
            </span>
            <span className="text-[var(--text-muted)] text-xs ml-2 hidden sm:inline">
              {meta.repo || "PostHog"} · {meta.total_prs_analyzed} PRs analyzed
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/pipeline" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">
              Pipeline
            </a>
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-bg-border text-sm">
          <span className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)] font-semibold">{formatNumber(teamStats.total_prs_merged)}</strong>
            <span className="ml-1">PRs merged</span>
          </span>
          <span className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)] font-semibold">{formatNumber(teamStats.total_reviews)}</strong>
            <span className="ml-1">reviews</span>
          </span>
          <span className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)] font-semibold">{meta.total_engineers}</strong>
            <span className="ml-1">engineers</span>
          </span>
          <span className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)] font-semibold">{teamStats.first_pass_approval_rate ?? 0}%</strong>
            <span className="ml-1">first-pass</span>
          </span>
          {(teamStats.avg_time_to_first_review_hours ?? 0) > 0 && (
            <span className="text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)] font-semibold">
                {formatHours(teamStats.avg_time_to_first_review_hours!)}
              </strong>
              <span className="ml-1">avg to first review</span>
            </span>
          )}
          {Object.keys(wb).length > 0 && (
            <div className="flex gap-2 items-center flex-wrap border-l border-bg-border pl-4 ml-1">
              {["feature", "bugfix", "refactor", "infra", "chore"].map((type) => {
                const pct = Math.round(((wb[type] ?? 0) / totalPRs) * 100);
                if (pct === 0) return null;
                return (
                  <span
                    key={type}
                    className="text-xs text-[var(--text-muted)]"
                    style={{ color: getWorkTypeColor(type) }}
                  >
                    {type} {pct}%
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

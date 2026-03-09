"use client";

import type { TeamStats, DashboardMeta } from "@/lib/types";
import { formatNumber, formatHours } from "@/lib/formatters";

interface KeyMetricsCardsProps {
  meta: DashboardMeta;
  teamStats: TeamStats;
}

const METRICS: {
  key: keyof TeamStats;
  label: string;
  explain: string;
  format: (v: number) => string;
}[] = [
  {
    key: "total_prs_merged",
    label: "PRs merged",
    explain: "Total merged in the period",
    format: (v) => formatNumber(v),
  },
  {
    key: "total_reviews",
    label: "Reviews given",
    explain: "Code reviews submitted",
    format: (v) => formatNumber(v),
  },
  {
    key: "avg_time_to_first_review_hours",
    label: "Avg time to first review",
    explain: "How fast PRs get a first review",
    format: (v) => (v > 0 ? formatHours(v) : "—"),
  },
  {
    key: "first_pass_approval_rate",
    label: "First-pass approval %",
    explain: "PRs approved without changes requested",
    format: (v) => `${v}%`,
  },
];

export function KeyMetricsCards({ meta, teamStats }: KeyMetricsCardsProps) {
  return (
    <section className="card-weave overflow-hidden">
      <div className="px-5 py-3 border-b border-bg-border flex items-center gap-2">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Team at a glance</h3>
        <span
          className="text-[var(--text-muted)] cursor-help"
          title="Key numbers for the analysis period."
          aria-label="Info"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map(({ key, label, explain, format }) => {
          const raw = teamStats[key];
          const value = typeof raw === "number" ? raw : Number(raw) ?? 0;
          return (
            <div key={key} className="rounded-lg border border-bg-border bg-bg-secondary p-3">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
              <p className="text-xl font-bold font-mono text-accent tabular-nums">
                {key === "first_pass_approval_rate" ? (value ? `${value}%` : "—") : format(value)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{explain}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

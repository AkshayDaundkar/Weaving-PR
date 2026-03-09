"use client";

import type { DashboardMeta, TeamStats } from "@/lib/types";

export interface HeroMetricCardProps {
  meta: DashboardMeta;
  teamStats: TeamStats;
}

export function HeroMetricCard({ meta, teamStats }: HeroMetricCardProps) {
  const generatedLabel = meta.generated_at
    ? new Date(meta.generated_at).toLocaleDateString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <div className="rounded-xl bg-slate-900 text-white p-6 shadow-lg">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">
            Last updated
          </p>
          <p className="text-xl mt-1">{generatedLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wide">
            Average impact
          </p>
          <p className="text-4xl font-bold text-indigo-300 mt-1">
            {teamStats.avg_impact_score.toFixed(1)}
          </p>
          <p className="text-slate-500 text-sm mt-0.5">
            across {teamStats.total_engineers} engineers
          </p>
        </div>
      </div>
    </div>
  );
}

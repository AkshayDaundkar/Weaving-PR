"use client";

import type { TeamStats } from "@/lib/types";

export interface KeyMetricsCardsProps {
  teamStats: TeamStats;
}

const cardClass =
  "rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-colors";

export function KeyMetricsCards({ teamStats }: KeyMetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className={cardClass}>
        <p className="text-slate-500 text-sm font-medium">Total PRs merged</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">
          {teamStats.total_prs_merged.toLocaleString()}
        </p>
      </div>
      <div className={cardClass}>
        <p className="text-slate-500 text-sm font-medium">Total reviews</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">
          {teamStats.total_reviews.toLocaleString()}
        </p>
      </div>
      <div className={cardClass}>
        <p className="text-slate-500 text-sm font-medium">Avg time to first review</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">
          {teamStats.avg_time_to_first_review_hours != null
            ? `${teamStats.avg_time_to_first_review_hours.toFixed(1)}h`
            : "—"}
        </p>
      </div>
      <div className={cardClass}>
        <p className="text-slate-500 text-sm font-medium">First-pass approval rate</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">
          {teamStats.first_pass_approval_rate != null
            ? `${teamStats.first_pass_approval_rate}%`
            : "—"}
        </p>
      </div>
    </div>
  );
}

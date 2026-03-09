"use client";

import type { EngineerResponse } from "@/lib/types";

export interface TopReviewersCardProps {
  engineers: EngineerResponse[];
  limit?: number;
  onSelect?: (login: string) => void;
}

export function TopReviewersCard({
  engineers,
  limit = 5,
  onSelect,
}: TopReviewersCardProps) {
  const byReviews = [...engineers]
    .filter((e) => (e.raw_stats?.reviews_given ?? 0) > 0)
    .sort((a, b) => (b.raw_stats?.reviews_given ?? 0) - (a.raw_stats?.reviews_given ?? 0))
    .slice(0, limit);

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Top reviewers</h3>
      <ul className="space-y-2">
        {byReviews.length === 0 ? (
          <li className="text-slate-400 text-sm">No review data</li>
        ) : (
          byReviews.map((e) => (
            <li key={e.login} className="flex justify-between items-center text-sm">
              <button
                type="button"
                onClick={() => onSelect?.(e.login)}
                className="font-medium text-slate-700 hover:text-indigo-600 text-left"
              >
                {e.login}
              </button>
              <span className="text-slate-500 tabular-nums">
                {e.raw_stats?.reviews_given ?? 0} reviews
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

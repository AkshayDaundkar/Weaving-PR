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
  const raw = (e: EngineerResponse) => (e.raw_stats as Record<string, number> | undefined)?.reviews_given ?? 0;
  const byReviews = [...engineers]
    .filter((e) => raw(e) > 0)
    .sort((a, b) => raw(b) - raw(a))
    .slice(0, limit);

  return (
    <div className="card-weave p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top reviewers</h3>
      <ul className="space-y-2">
        {byReviews.length === 0 ? (
          <li className="text-[var(--text-muted)] text-sm">No review data</li>
        ) : (
          byReviews.map((e) => (
            <li key={e.login} className="flex justify-between items-center text-sm">
              <button
                type="button"
                onClick={() => onSelect?.(e.login)}
                className="font-medium text-[var(--text-secondary)] hover:text-accent text-left"
              >
                {e.login}
              </button>
              <span className="text-[var(--text-muted)] tabular-nums">
                {raw(e)} reviews
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

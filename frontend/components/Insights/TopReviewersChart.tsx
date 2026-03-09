"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { EngineerResponse } from "@/lib/types";

interface TopReviewersChartProps {
  engineers: EngineerResponse[];
  topN?: number;
}

export function TopReviewersChart({ engineers, topN = 10 }: TopReviewersChartProps) {
  const data = [...engineers]
    .sort(
      (a, b) =>
        ((b.raw_stats as Record<string, number> | undefined)?.reviews_given ?? 0) -
        ((a.raw_stats as Record<string, number> | undefined)?.reviews_given ?? 0)
    )
    .slice(0, topN)
    .map((e) => ({
      login: e.login,
      reviews: (e.raw_stats as Record<string, number> | undefined)?.reviews_given ?? 0,
      prs: (e.raw_stats as Record<string, number> | undefined)?.prs_merged ?? 0,
    }))
    .filter((d) => d.reviews > 0);

  if (data.length === 0) return null;

  const totalReviews = data.reduce((a, b) => a + b.reviews, 0);

  return (
    <section className="card-weave overflow-hidden">
      <div className="px-5 py-3 border-b border-bg-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Code reviews</h3>
          <span
            className="text-[var(--text-muted)] cursor-help"
            title="Top engineers by number of reviews given."
            aria-label="Info"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
        <span className="text-sm font-semibold text-accent tabular-nums">{totalReviews} total</span>
      </div>
      <p className="px-5 py-2 text-xs text-[var(--text-muted)] border-b border-bg-border">
        Top {topN} by reviews given. Hover for PR count.
      </p>
      <div className="p-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="login"
              width={80}
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
            />
            <Bar
              dataKey="reviews"
              fill="var(--chart-primary)"
              radius={[0, 4, 4, 0]}
              name="Reviews"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--bg-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, _name: string, props: { payload?: { login: string; prs: number } }) => [
                `${value} reviews (${props.payload?.prs ?? 0} PRs merged)`,
                props.payload?.login ?? "",
              ]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { EngineerResponse } from "@/lib/types";

interface ReviewQualityCardProps {
  engineers: EngineerResponse[];
  topN?: number;
}

export function ReviewQualityCard({ engineers, topN = 8 }: ReviewQualityCardProps) {
  const data = [...engineers]
    .sort((a, b) => (b.dimensions?.review_impact ?? 0) - (a.dimensions?.review_impact ?? 0))
    .slice(0, topN)
    .map((e) => ({
      login: e.login,
      quality: Math.round(e.dimensions?.review_impact ?? 0),
      reviews: (e.raw_stats as Record<string, number> | undefined)?.reviews_given ?? 0,
    }))
    .filter((d) => d.quality > 0 || d.reviews > 0);

  if (data.length === 0) return null;

  const avgQuality =
    data.length > 0
      ? (data.reduce((a, b) => a + b.quality, 0) / data.length).toFixed(1)
      : "—";

  return (
    <div className="card-weave overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3 border-b border-bg-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Review impact (quality)
          </h3>
          <span
            className="text-[var(--text-muted)] cursor-help"
            title="Depth of reviews (0–100 percentile) weighted by PR complexity."
            aria-label="Info"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
        <span className="text-sm font-semibold text-accent tabular-nums">{avgQuality} avg</span>
      </div>
      <p className="px-5 py-2 text-xs text-[var(--text-muted)] border-b border-bg-border">
        Score 0–100 by depth and complexity of PRs reviewed.
      </p>
      <div className="p-4 flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="login"
              width={72}
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--bg-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, _name: string, props: { payload?: { reviews: number } }) => [
                `${value} (${props.payload?.reviews ?? 0} reviews)`,
                "Quality",
              ]}
            />
            <Bar
              dataKey="quality"
              name="Quality"
              fill="var(--chart-primary)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

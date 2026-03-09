"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { EngineerResponse } from "@/lib/types";

export interface OutputOverTimeChartProps {
  engineers: EngineerResponse[];
}

const WEEKS = 13;

export function OutputOverTimeChart({ engineers }: OutputOverTimeChartProps) {
  const byWeek = Array.from({ length: WEEKS }, (_, i) => {
    let sum = 0;
    let count = 0;
    engineers.forEach((e) => {
      const w = e.weekly_impact?.[i];
      if (typeof w === "number") {
        sum += w;
        count += 1;
      }
    });
    const avg = count > 0 ? sum / count : 0;
    return {
      week: `W${i + 1}`,
      label: i === 0 ? "Oldest" : i === WEEKS - 1 ? "Latest" : `W${i + 1}`,
      value: Math.round(avg * 10) / 10,
      fullLabel: `Week ${i + 1}`,
    };
  }).filter((d) => d.value > 0 || d.week === "W1" || d.week === `W${WEEKS}`);

  if (byWeek.length === 0) return null;

  return (
    <div className="card-weave overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3 border-b border-bg-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Output over time</h3>
          <span
            className="text-[var(--text-muted)] cursor-help"
            title="Average impact per engineer per week (W1 = oldest, W13 = most recent)."
            aria-label="Info"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
        <span className="text-sm font-semibold text-accent tabular-nums">
          {byWeek.length > 0 ? (byWeek.reduce((a, b) => a + b.value, 0) / byWeek.length).toFixed(1) : "—"} avg
        </span>
      </div>
      <div className="p-4 flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byWeek} margin={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--bg-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, _name: string, props: { payload?: { fullLabel: string } }) => [
                value,
                props.payload?.fullLabel ?? "",
              ]}
            />
            <Bar dataKey="value" name="Impact" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { TeamStats, EngineerResponse } from "@/lib/types";
import { getWorkTypeColor } from "@/lib/colors";

interface TeamInvestmentChartProps {
  teamStats: TeamStats;
  /** If teamStats has no work_breakdown, aggregate from these engineers. */
  engineers?: EngineerResponse[];
}

export function TeamInvestmentChart({ teamStats, engineers = [] }: TeamInvestmentChartProps) {
  let wb: Record<string, number> = teamStats.work_breakdown ?? {};
  if (Object.keys(wb).length === 0 && engineers.length > 0) {
    const agg: Record<string, number> = {};
    for (const e of engineers) {
      const prs = (e.raw_stats as Record<string, number> | undefined)?.prs_merged ?? 0;
      for (const [type, pct] of Object.entries(e.work_breakdown ?? {})) {
        agg[type] = (agg[type] ?? 0) + (pct / 100) * prs;
      }
    }
    wb = agg;
  }
  const total = teamStats.total_prs_merged || 1;
  const totalWork = Math.max(1, Object.values(wb).reduce((a, b) => a + b, 0));
  const data = ["feature", "bugfix", "refactor", "infra", "test", "docs", "chore"]
    .map((type) => {
      const count = Math.round(wb[type] ?? 0);
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        type: type.replace(/_/g, " "),
        count,
        pct,
      };
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) return null;

  return (
    <section className="card-weave overflow-hidden">
      <div className="px-5 py-3 border-b border-bg-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Output by type</h3>
          <span
            className="text-[var(--text-muted)] cursor-help"
            title="PRs merged by work type (feature, bugfix, refactor, etc.)."
            aria-label="Info"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
        <span className="text-sm font-semibold text-accent tabular-nums">{total} PRs</span>
      </div>
      <div className="p-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, bottom: 8 }}>
            <XAxis
              dataKey="type"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
            <Bar dataKey="count" name="PRs" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={getWorkTypeColor(entry.type)} />
              ))}
            </Bar>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--bg-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, _name: string, props: { payload: { pct: number; type: string } }) => [
                `${value} PRs (${props.payload.pct}%)`,
                props.payload.type,
              ]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

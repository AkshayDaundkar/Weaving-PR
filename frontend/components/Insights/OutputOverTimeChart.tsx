"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { EngineerResponse } from "@/lib/types";

export interface OutputOverTimeChartProps {
  engineers: EngineerResponse[];
}

/** Build weekly series: sum of weekly_impact across engineers per week index (0 = oldest). */
function buildWeeklySeries(engineers: EngineerResponse[]): { week: string; output: number }[] {
  const weeks = 13;
  const sums = new Array(weeks).fill(0);
  for (const e of engineers) {
    const w = e.weekly_impact || [];
    for (let i = 0; i < weeks && i < w.length; i++) {
      sums[i] += w[i] ?? 0;
    }
  }
  return sums.map((output, i) => ({
    week: `W${i + 1}`,
    output: Math.round(output * 10) / 10,
  }));
}

export function OutputOverTimeChart({ engineers }: OutputOverTimeChartProps) {
  const data = buildWeeklySeries(engineers);

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm h-72">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Output over time</h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(79, 70, 229)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="rgb(79, 70, 229)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
            formatter={(value: number) => [value, "Impact"]}
            labelFormatter={(label) => `Week ${label.replace("W", "")}`}
          />
          <Area
            type="monotone"
            dataKey="output"
            stroke="rgb(79, 70, 229)"
            strokeWidth={2}
            fill="url(#outputGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

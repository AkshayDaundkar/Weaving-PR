"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { EngineerDimensions } from "@/lib/types";

interface ScoreRadarProps {
  dimensions: EngineerDimensions;
}

const DIM_LABELS: Record<keyof EngineerDimensions, string> = {
  pr_output: "PR output",
  review_impact: "Review impact",
  velocity: "Velocity",
  quality: "Quality",
};

export function ScoreRadar({ dimensions }: ScoreRadarProps) {
  const data = (Object.entries(dimensions) as [keyof EngineerDimensions, number][]).map(
    ([key, value]) => ({
      dimension: DIM_LABELS[key],
      value: Math.min(100, Math.max(0, value)),
      fullMark: 100,
    })
  );

  return (
    <div className="w-full">
      <p className="text-xs text-[var(--text-muted)] mb-2">
        Percentile vs team (0–100). Higher = better. Outer edge = 100.
      </p>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="var(--bg-border)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickCount={5}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.35}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--bg-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text-primary)",
              }}
              formatter={(value: number) => [`${value.toFixed(0)} (percentile)`, "Score"]}
              labelFormatter={(label) => `${label}`}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[var(--text-muted)]">
        {data.map((d) => (
          <span key={d.dimension}>
            {d.dimension}: <strong className="text-[var(--text-secondary)] font-mono">{d.value.toFixed(0)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { EngineerDimensions } from "@/lib/types";

export interface DimensionBarsProps {
  dimensions: EngineerDimensions;
  title?: string;
}

function dimBarColor(value: number): string {
  if (value >= 70) return "bg-score-high";
  if (value >= 40) return "bg-score-mid";
  return "bg-score-low";
}

const DIM_LABELS: { key: keyof EngineerDimensions; label: string }[] = [
  { key: "pr_output", label: "PR output" },
  { key: "review_impact", label: "Review impact" },
  { key: "velocity", label: "Velocity" },
  { key: "quality", label: "Quality" },
];

export function DimensionBars({ dimensions, title = "Dimensions" }: DimensionBarsProps) {
  return (
    <div className="card-weave p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{title}</h3>
      <div className="space-y-2">
        {DIM_LABELS.map(({ key, label }) => {
          const value = dimensions[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[var(--text-secondary)] text-sm w-28 shrink-0">{label}</span>
              <div className="flex-1 h-3 rounded-full bg-bg-tertiary overflow-hidden max-w-xs">
                <div
                  className={`h-full rounded-full ${dimBarColor(value)}`}
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
              </div>
              <span className="text-[var(--text-primary)] text-sm w-8 text-right font-medium">
                {value.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

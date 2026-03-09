/** Product area and work type colors for charts and badges. */

export const AREA_COLORS: Record<string, string> = {
  analytics: "#6366f1",
  session_replay: "#8b5cf6",
  feature_flags: "#06b6d4",
  data_warehouse: "#10b981",
  ingestion: "#f59e0b",
  error_tracking: "#ef4444",
  infrastructure: "#64748b",
  surveys: "#ec4899",
  enterprise: "#84cc16",
  frontend_core: "#0ea5e9",
  other: "#94a3b8",
};

export const WORK_TYPE_COLORS: Record<string, string> = {
  feature: "#10b981",
  bugfix: "#f59e0b",
  refactor: "#6366f1",
  infra: "#64748b",
  test: "#8b5cf6",
  docs: "#06b6d4",
  chore: "#94a3b8",
};

export function getWorkTypeColor(type: string): string {
  const key = type.replace(/\s/g, "_").toLowerCase();
  return WORK_TYPE_COLORS[key] ?? WORK_TYPE_COLORS.chore ?? "#94a3b8";
}

export function getAreaColor(area: string): string {
  return AREA_COLORS[area] ?? AREA_COLORS.other ?? "#94a3b8";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-score-high";
  if (score >= 50) return "text-score-mid";
  return "text-score-low";
}

export function momentumColor(momentum: number): string {
  if (momentum > 0) return "text-momentum-up";
  if (momentum < 0) return "text-momentum-down";
  return "text-momentum-flat";
}

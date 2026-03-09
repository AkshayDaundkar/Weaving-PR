/** Mirrors backend Pydantic models. Keep in sync with app/models/. */

export interface EngineerDimensions {
  pr_output: number;
  review_impact: number;
  velocity: number;
  quality: number;
}

export interface EngineerSummary {
  login: string;
  avatar_url: string;
  github_url: string;
  rank: number;
  impact_score: number;
  momentum: number;
  narrative: string;
  dimensions: EngineerDimensions;
  work_breakdown: Record<string, number>;
  raw_stats: Record<string, number>;
}

export interface DashboardResponse {
  engineers: EngineerSummary[];
  generated_at: string;
  repo: string;
  lookback_days: number;
}

/** Mirrors backend Pydantic models. Keep in sync with app/models/. */

export interface EngineerDimensions {
  pr_output: number;
  review_impact: number;
  velocity: number;
  quality: number;
}

export interface TopPR {
  number: number;
  title: string;
  url: string;
  complexity: string;
  work_type: string;
  additions: number;
  deletions: number;
  merged_at: string;
}

export interface EngineerResponse {
  login: string;
  name: string;
  avatar_url: string;
  github_url: string;
  rank: number;
  impact_score: number;
  momentum: number;
  narrative: string;
  dimensions: EngineerDimensions;
  work_breakdown: Record<string, number>;
  area_breakdown: Record<string, number>;
  primary_area: string;
  areas_covered: string[];
  top_prs: TopPR[];
  weekly_impact: number[];
  raw_stats: Record<string, number>;
}

/** Alias for EngineerResponse (same shape as backend). */
export type Engineer = EngineerResponse;

export interface TeamStats {
  total_prs_analyzed: number;
  total_prs_merged: number;
  total_reviews: number;
  total_engineers: number;
  avg_impact_score: number;
  period_days: number;
}

export interface DashboardMeta {
  generated_at: string;
  date_from: string;
  date_to: string;
  repo: string;
  total_prs_analyzed: number;
  total_engineers: number;
  methodology_version: string;
}

export interface NetworkNode {
  id: string;
  login?: string;
  name?: string;
  avatar_url?: string;
  avatar?: string;
  value?: number;
  size?: number;
  group?: string;
  label?: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  value?: number;
  label?: string;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface KnowledgeMapEntry {
  engineer: string;
  pr_count: number;
  pct_of_area: number;
}

export interface DashboardData {
  meta: DashboardMeta;
  top5: EngineerResponse[];
  all_engineers: EngineerResponse[];
  collaboration_network: NetworkData;
  hidden_heroes: string[];
  rising_stars: string[];
  team_stats: TeamStats;
  knowledge_map: Record<string, KnowledgeMapEntry[]>;
}

export interface ChatRequest {
  question: string;
  selected_engineer?: string | null;
}

export interface ChatResponse {
  answer: string;
}

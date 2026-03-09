/** All API calls go through this file. Contract with backend. */

import type {
  ChatResponse,
  DashboardData,
  EngineerResponse,
  NetworkData,
  PipelineStatus,
} from "./types";

/** Server-side: use NEXT_PUBLIC_API_URL or localhost:8000. Client-side: same-origin so Next rewrites /api/* to backend. */
const API_BASE =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    : "";

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/api/dashboard`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
  return res.json();
}

export async function getEngineers(limit: number = 100): Promise<EngineerResponse[]> {
  const res = await fetch(`${API_BASE}/api/engineers?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch engineers: ${res.status}`);
  return res.json();
}

export async function getEngineer(login: string): Promise<EngineerResponse> {
  const res = await fetch(`${API_BASE}/api/engineers/${encodeURIComponent(login)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Engineer '${login}' not found`);
    throw new Error(`Failed to fetch engineer: ${res.status}`);
  }
  return res.json();
}

export async function getNetwork(): Promise<NetworkData> {
  const res = await fetch(`${API_BASE}/api/network`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch network: ${res.status}`);
  return res.json();
}

export async function postChat(
  question: string,
  selectedEngineer?: string | null
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      selected_engineer: selectedEngineer ?? null,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to chat: ${res.status}`);
  return res.json();
}

export async function getPipelineStatus(): Promise<PipelineStatus> {
  const res = await fetch(`${API_BASE}/api/pipeline/status`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch pipeline status: ${res.status}`);
  return res.json();
}

export async function runPipelineStep(
  step: "collect" | "classify" | "score"
): Promise<{ status: string; step: string }> {
  const res = await fetch(`${API_BASE}/api/pipeline/run?step=${step}`, {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Failed to run pipeline step: ${res.status}`);
  }
  return res.json();
}

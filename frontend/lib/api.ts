/** All API calls go through this file. Contract with backend. */

import type { DashboardResponse } from "./types";

const API_BASE =
  typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE}/api/dashboard`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
  return res.json();
}

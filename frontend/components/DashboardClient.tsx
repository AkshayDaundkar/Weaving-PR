"use client";

import { useState, useCallback } from "react";
import type { DashboardData, EngineerResponse } from "@/lib/types";
import { Leaderboard } from "@/components/Leaderboard/Leaderboard";
import { DetailPanel } from "@/components/EngineerDetail/DetailPanel";

export interface DashboardClientProps {
  data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null);

  const handleSelect = useCallback((login: string) => {
    setSelectedLogin((prev) => (prev === login ? null : login));
  }, []);

  const selectedEngineer: EngineerResponse | null =
    selectedLogin ? data.all_engineers.find((e) => e.login === selectedLogin) ?? null : null;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">
          Engineering Impact Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          {data.meta.repo}
          {data.meta.date_from && ` · ${data.meta.date_from} → ${data.meta.date_to}`}
          {data.meta.generated_at && ` · generated ${data.meta.generated_at}`}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-medium text-slate-700 mb-4">Top engineers</h2>
        <Leaderboard
          engineers={data.top5}
          selectedLogin={selectedLogin}
          onSelect={handleSelect}
        />
      </section>

      {selectedEngineer && (
        <section className="mt-6">
          <DetailPanel engineer={selectedEngineer} onClose={() => setSelectedLogin(null)} />
        </section>
      )}
    </main>
  );
}

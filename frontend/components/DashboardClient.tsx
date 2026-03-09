"use client";

import { useState, useCallback } from "react";
import type { DashboardData, EngineerResponse } from "@/lib/types";
import { Leaderboard } from "@/components/Leaderboard/Leaderboard";
import { DetailPanel } from "@/components/EngineerDetail/DetailPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Chatbot } from "@/components/Chatbot/Chatbot";
import {
  HeroMetricCard,
  KeyMetricsCards,
  OutputOverTimeChart,
  DimensionBars,
  InsightsRow,
  TopReviewersCard,
} from "@/components/Insights";

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
    <main className="min-h-screen bg-primary">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              Engineering Impact Dashboard
            </h1>
            <p className="text-muted mt-1">
              {data.meta.repo}
              {data.meta.date_from && ` · ${data.meta.date_from} → ${data.meta.date_to}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/pipeline"
              className="text-sm text-muted hover:text-primary underline"
            >
              Pipeline
            </a>
            <ThemeToggle />
          </div>
        </header>

        <section>
          <HeroMetricCard meta={data.meta} teamStats={data.team_stats} />
        </section>

        <section>
          <KeyMetricsCards teamStats={data.team_stats} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary mb-4">Top engineers</h2>
          <Leaderboard
            engineers={data.top5}
            selectedLogin={selectedLogin}
            onSelect={handleSelect}
          />
        </section>

        {selectedEngineer && (
          <section>
            <DetailPanel engineer={selectedEngineer} onClose={() => setSelectedLogin(null)} />
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-primary">Insights</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <OutputOverTimeChart engineers={data.all_engineers} />
            </div>
            <div className="space-y-4">
              {selectedEngineer && (
                <DimensionBars
                  dimensions={selectedEngineer.dimensions}
                  title={`${selectedEngineer.login} — dimensions`}
                />
              )}
              <TopReviewersCard
                engineers={data.all_engineers}
                limit={5}
                onSelect={handleSelect}
              />
            </div>
          </div>

          <InsightsRow
            hiddenHeroes={data.hidden_heroes}
            risingStars={data.rising_stars}
            allEngineers={data.all_engineers}
            onSelectEngineer={handleSelect}
          />
        </section>
      </div>

      <Chatbot selectedEngineer={selectedLogin} />
    </main>
  );
}

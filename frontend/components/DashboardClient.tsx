"use client";

import { useState, useCallback, useMemo } from "react";
import type { DashboardData, EngineerResponse } from "@/lib/types";
import { Header } from "@/components/Header";
import { Leaderboard } from "@/components/Leaderboard/Leaderboard";
import { DetailPanel } from "@/components/EngineerDetail/DetailPanel";
import { MethodologyPanel } from "@/components/Methodology/MethodologyPanel";
import { Chatbot } from "@/components/Chatbot/Chatbot";
import {
  HeroMetricCard,
  KeyMetricsCards,
  OutputOverTimeChart,
  DimensionBars,
  InsightsRow,
  TopReviewersCard,
  ReviewQualityCard,
  TeamInvestmentChart,
  TopReviewersChart,
  MetricComparisonTable,
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

  const headerWorkBreakdown = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const e of data.all_engineers) {
      const prs = (e.raw_stats as Record<string, number> | undefined)?.prs_merged ?? 0;
      for (const [type, pct] of Object.entries(e.work_breakdown ?? {})) {
        agg[type] = (agg[type] ?? 0) + (pct / 100) * prs;
      }
    }
    return agg;
  }, [data.all_engineers]);

  const avgImpact =
    data.all_engineers.length > 0
      ? data.all_engineers.reduce((a, e) => a + e.impact_score, 0) / data.all_engineers.length
      : 0;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header
        meta={data.meta}
        teamStats={data.team_stats}
        workBreakdown={headerWorkBreakdown}
      />
      <main className="max-w-[1280px] mx-auto px-4 py-6 space-y-8">
        <div className="rounded-lg border border-bg-border bg-bg-secondary px-4 py-3 text-sm text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">How to read this:</strong>{" "}
          Impact is ranked by four dimensions—PR output (40%), review impact (25%), velocity (20%), and quality (15%).
          Click an engineer for details. Use the chat button for questions about rankings and methodology.
        </div>

        <HeroMetricCard meta={data.meta} teamStats={data.team_stats} avgImpact={avgImpact} />
        <KeyMetricsCards meta={data.meta} teamStats={data.team_stats} />

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Top engineers</h2>
          <Leaderboard
            engineers={data.top5}
            selectedLogin={selectedLogin}
            onSelect={handleSelect}
          />
        </section>

        {selectedEngineer && (
          <DetailPanel engineer={selectedEngineer} onClose={() => setSelectedLogin(null)} />
        )}

        <section>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Core capabilities
          </p>
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
              <div className="flex-1 min-h-[260px]">
                <OutputOverTimeChart engineers={data.all_engineers} />
              </div>
              <div className="lg:w-80 flex flex-col justify-center lg:py-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Output over time</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                  Average impact per engineer per week. W1 is the oldest week in the period, latest week shows recent output.
                </p>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
              <div className="flex-1 min-h-[260px]">
                <ReviewQualityCard engineers={data.all_engineers} topN={8} />
              </div>
              <div className="lg:w-80 flex flex-col justify-center lg:py-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Review impact (quality)</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                  Score code review quality on depth and the complexity of PRs reviewed.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamInvestmentChart teamStats={data.team_stats} engineers={data.all_engineers} />
          <TopReviewersChart engineers={data.all_engineers} topN={10} />
        </div>

        <section>
          <MetricComparisonTable />
        </section>

        {selectedEngineer && (
          <DimensionBars
            dimensions={selectedEngineer.dimensions}
            title={`Impact breakdown — ${selectedEngineer.login}`}
          />
        )}

        <InsightsRow
          hiddenHeroes={data.hidden_heroes}
          risingStars={data.rising_stars}
          allEngineers={data.all_engineers}
          onSelectEngineer={handleSelect}
        />

        <MethodologyPanel selectedEngineer={selectedEngineer} />
      </main>
      <Chatbot selectedEngineer={selectedLogin} />
    </div>
  );
}

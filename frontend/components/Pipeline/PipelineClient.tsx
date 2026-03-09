"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPipelineStatus, runPipelineStep } from "@/lib/api";
import type { PipelineStatus } from "@/lib/types";

const POLL_MS = 2000;

export function PipelineClient() {
  const router = useRouter();
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await getPipelineStatus();
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline status");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const runStep = async (step: "collect" | "classify" | "score") => {
    setActionError(null);
    try {
      await runPipelineStep(step);
      await fetchStatus();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to run step");
    }
  };

  if (error && !status) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center p-6">
        <div className="text-center text-muted">
          <p>Could not connect to the pipeline. Is the backend running?</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!status) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center p-6">
        <div className="text-primary">Loading pipeline status…</div>
      </main>
    );
  }

  const { collect_done, classify_done, score_done, pr_count, classified_count, running_step, days_lookback } = status;
  const steps = [
    { key: "collect", label: "Collect", done: collect_done, detail: collect_done ? `${pr_count} PRs (${days_lookback} days)` : "Fetch PRs from GitHub" },
    { key: "classify", label: "Classify", done: classify_done, detail: classify_done ? `${classified_count} classified` : "Classify PRs (LLM or heuristic)" },
    { key: "score", label: "Score", done: score_done, detail: score_done ? "Engineers scored" : "Compute impact scores" },
  ];
  const doneCount = [collect_done, classify_done, score_done].filter(Boolean).length;
  const progressPct = (doneCount / 3) * 100;

  return (
    <main className="min-h-screen bg-primary text-primary">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-primary">Pipeline</h1>
          <p className="text-muted mt-1">
            Run collect → classify → score to build the impact dashboard data.
          </p>
        </header>

        {/* Progress bar */}
        <section>
          <div className="flex justify-between text-sm text-muted mb-2">
            <span>Progress</span>
            <span>{doneCount} / 3 steps</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[var(--border-default)] overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {steps.map((s) => (
              <div
                key={s.key}
                className={`text-center text-xs rounded py-1.5 ${
                  s.done ? "bg-accent/20 text-accent" : "text-muted"
                }`}
              >
                {s.label}: {s.done ? "✓" : "—"}
              </div>
            ))}
          </div>
        </section>

        {/* Step details and buttons */}
        <section className="space-y-4">
          {steps.map((s, i) => {
            const isRunning = running_step === s.key;
            const canRun =
              s.key === "collect" ||
              (s.key === "classify" && collect_done) ||
              (s.key === "score" && classify_done);
            const disabled = !canRun || isRunning || !!running_step;

            return (
              <div
                key={s.key}
                className="rounded-xl border border-[var(--border-default)] bg-card p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-primary">
                    {i + 1}. {s.label}
                  </p>
                  <p className="text-sm text-muted mt-0.5">{s.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runStep(s.key as "collect" | "classify" | "score")}
                  disabled={disabled}
                  className="shrink-0 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {isRunning ? "Running…" : s.done ? "Re-run" : "Run"}
                </button>
              </div>
            );
          })}
        </section>

        {actionError && (
          <p className="text-sm text-red-500">{actionError}</p>
        )}

        {/* Redirect to dashboard when all done */}
        {score_done && (
          <section className="rounded-xl border border-[var(--border-default)] bg-card p-6 text-center">
            <p className="text-primary font-medium mb-2">Pipeline complete</p>
            <p className="text-sm text-muted mb-4">
              Impact data is ready. View the dashboard to see results.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-6 py-3 rounded-lg bg-posthog-orange text-white font-medium hover:opacity-90 transition-opacity"
            >
              View dashboard
            </button>
          </section>
        )}

        <p className="text-sm text-muted">
          <a href="/" className="underline hover:text-primary">Back to dashboard</a>
          {" · "}
          If data is missing, run the steps above.
        </p>
      </div>
    </main>
  );
}

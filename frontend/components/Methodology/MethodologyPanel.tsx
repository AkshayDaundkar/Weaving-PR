"use client";

import { useState } from "react";
import type { EngineerResponse } from "@/lib/types";

interface MethodologyPanelProps {
  selectedEngineer?: EngineerResponse | null;
}

export function MethodologyPanel({ selectedEngineer }: MethodologyPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card-weave overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-tertiary transition-colors border-b border-bg-border bg-bg-tertiary"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          How impact is calculated
        </h2>
        <span className="text-[var(--text-muted)] text-xl leading-none">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="px-4 py-4 space-y-4 text-sm text-[var(--text-secondary)] border-t border-bg-border">
          <p>
            Impact is defined across four dimensions, all percentile-ranked across
            the team and traceable to raw GitHub data:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong className="text-[var(--text-primary)]">PR complexity output (40%)</strong> —{" "}
              Sum of complexity per merged PR (file-type weights, size, breadth × LLM complexity).
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Review impact (25%)</strong> —{" "}
              Depth of reviews weighted by the complexity of the PRs reviewed.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Velocity enablement (20%)</strong> —{" "}
              How quickly this engineer gives the first review (median time to first review).
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Quality & reliability (15%)</strong> —{" "}
              Issue-linked PRs, first-pass approval rate, product-area breadth.
            </li>
          </ul>
          {selectedEngineer && (
            <div className="rounded-md bg-bg-tertiary p-3 border border-bg-border">
              <p className="text-[var(--text-primary)] font-medium mb-2">
                Applied to {selectedEngineer.login}:
              </p>
              <ul className="space-y-1 text-xs">
                <li>
                  PR Output: {selectedEngineer.dimensions.pr_output} — {selectedEngineer.raw_stats?.prs_merged ?? 0} merged PRs (percentile rank).
                </li>
                <li>
                  Review impact: {selectedEngineer.dimensions.review_impact} — {selectedEngineer.raw_stats?.reviews_given ?? 0} reviews.
                </li>
                <li>
                  Velocity: {selectedEngineer.dimensions.velocity} — median {(selectedEngineer.raw_stats as Record<string, number> | undefined)?.median_review_time_hours ?? "—"}h to first review.
                </li>
                <li>
                  Quality: {selectedEngineer.dimensions.quality} — {(selectedEngineer.raw_stats as Record<string, number> | undefined)?.issue_linked_prs ?? 0} issue-linked, {(selectedEngineer.raw_stats as Record<string, number> | undefined)?.first_pass_approved_prs ?? 0} first-pass approved.
                </li>
              </ul>
            </div>
          )}
          <p>
            <strong className="text-[var(--text-primary)]">What we exclude:</strong> Raw line counts,
            commit count, and PR count alone. What we can&apos;t measure from GitHub: RFC/design docs,
            pair programming, mentoring.
          </p>
        </div>
      )}
    </section>
  );
}

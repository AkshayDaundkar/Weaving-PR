"use client";

import type { EngineerResponse } from "@/lib/types";

export interface DetailPanelProps {
  engineer: EngineerResponse;
  onClose: () => void;
}

function dimBarColor(value: number): string {
  if (value >= 70) return "bg-score-high";
  if (value >= 40) return "bg-score-mid";
  return "bg-score-low";
}

export function DetailPanel({ engineer, onClose }: DetailPanelProps) {
  const d = engineer.dimensions;
  const dims = [
    { label: "PR output", value: d.pr_output },
    { label: "Review impact", value: d.review_impact },
    { label: "Velocity", value: d.velocity },
    { label: "Quality", value: d.quality },
  ] as const;

  const workEntries = Object.entries(engineer.work_breakdown).filter(([, pct]) => pct > 0);
  const areaEntries = Object.entries(engineer.area_breakdown).filter(([, pct]) => pct > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <a
            href={engineer.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-800 hover:text-blue-600"
          >
            {engineer.login}
          </a>
          <span className="text-slate-500 text-sm">#{engineer.rank}</span>
          <span className="text-slate-600 text-sm">Impact {engineer.impact_score.toFixed(1)}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 p-1 rounded"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-5">
        {engineer.narrative && (
          <p className="text-sm text-slate-600">{engineer.narrative}</p>
        )}

        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Dimensions (percentile 0–100)</h3>
          <div className="space-y-2">
            {dims.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-slate-600 text-sm w-28 shrink-0">{label}</span>
                <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden max-w-xs">
                  <div
                    className={`h-full rounded-full ${dimBarColor(value)}`}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </div>
                <span className="text-slate-700 text-sm w-8 text-right">{value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {(workEntries.length > 0 || areaEntries.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Work breakdown</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {workEntries.map(([type, pct]) => (
                    <li key={type} className="flex justify-between">
                      <span className="capitalize">{type.replace(/_/g, " ")}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {areaEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Area breakdown</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {areaEntries.map(([area, pct]) => (
                    <li key={area} className="flex justify-between">
                      <span className="capitalize">{area.replace(/_/g, " ")}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {engineer.top_prs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Top PRs</h3>
            <ul className="space-y-2">
              {engineer.top_prs.map((pr) => (
                <li key={pr.number} className="text-sm">
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block truncate"
                  >
                    #{pr.number} {pr.title || "(no title)"}
                  </a>
                  <span className="text-slate-500 text-xs">
                    {pr.work_type} · {pr.complexity} · +{pr.additions}/−{pr.deletions}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Raw stats</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
            {Object.entries(engineer.raw_stats).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <dt className="capitalize">{key.replace(/_/g, " ")}</dt>
                <dd className="text-slate-800 font-mono">
                  {typeof value === "number" && Number.isInteger(value) ? value : (value as number).toFixed(1)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

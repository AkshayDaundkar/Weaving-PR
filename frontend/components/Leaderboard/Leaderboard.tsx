"use client";

import type { EngineerResponse } from "@/lib/types";

export interface LeaderboardProps {
  engineers: EngineerResponse[];
  selectedLogin: string | null;
  onSelect: (login: string) => void;
}

function scoreBarColor(score: number): string {
  if (score >= 70) return "bg-score-high";
  if (score >= 40) return "bg-score-mid";
  return "bg-score-low";
}

export function Leaderboard({ engineers, selectedLogin, onSelect }: LeaderboardProps) {
  return (
    <ul className="space-y-3">
      {engineers.map((e) => {
        const isSelected = selectedLogin === e.login;
        return (
          <li
            key={e.login}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(e.login)}
            onKeyDown={(ev) => ev.key === "Enter" && onSelect(e.login)}
            className={`
              flex flex-col gap-2 p-4 rounded-lg border cursor-pointer transition-colors
              ${isSelected ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/30" : "border-slate-200 bg-white hover:bg-slate-50"}
            `}
          >
            <div className="flex items-center gap-4">
              <span className="text-slate-500 font-mono w-8 shrink-0">#{e.rank}</span>
              <div className="min-w-0 flex-1">
                <a
                  href={e.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(ev) => ev.stopPropagation()}
                  className="font-medium text-slate-800 hover:text-blue-600"
                >
                  {e.login}
                </a>
                <p className="text-sm text-slate-600 mt-0.5 truncate">{e.narrative}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden" title="Impact score">
                  <div
                    className={`h-full rounded-full ${scoreBarColor(e.impact_score)}`}
                    style={{ width: `${Math.min(100, Math.max(0, e.impact_score))}%` }}
                  />
                </div>
                <span className="font-semibold text-slate-800 w-10 text-right">
                  {e.impact_score.toFixed(1)}
                </span>
                {e.momentum !== 0 && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      e.momentum > 0 ? "bg-emerald-100 text-momentum-up" : "bg-red-100 text-momentum-down"
                    }`}
                  >
                    {e.momentum > 0 ? "+" : ""}
                    {e.momentum.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

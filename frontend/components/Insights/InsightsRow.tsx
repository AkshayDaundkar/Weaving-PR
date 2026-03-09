"use client";

import type { EngineerResponse } from "@/lib/types";

export interface InsightsRowProps {
  hiddenHeroes: string[];
  risingStars: string[];
  allEngineers: EngineerResponse[];
  onSelectEngineer?: (login: string) => void;
}

function EngineerChip({
  login,
  onClick,
}: {
  login: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors
        ${onClick ? "hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer" : "cursor-default"}
        border-slate-200 bg-white text-slate-700
      `}
    >
      {login}
    </button>
  );
}

export function InsightsRow({
  hiddenHeroes,
  risingStars,
  allEngineers,
  onSelectEngineer,
}: InsightsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Hidden heroes</h3>
        <p className="text-slate-500 text-xs mb-3">
          High review impact, lower PR count — multiplier work
        </p>
        <div className="flex flex-wrap gap-2">
          {hiddenHeroes.length === 0 ? (
            <span className="text-slate-400 text-sm">None identified</span>
          ) : (
            hiddenHeroes.map((login) => (
              <EngineerChip
                key={login}
                login={login}
                onClick={onSelectEngineer ? () => onSelectEngineer(login) : undefined}
              />
            ))
          )}
        </div>
      </div>
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Rising stars</h3>
        <p className="text-slate-500 text-xs mb-3">
          Strong recent momentum, not in top 5
        </p>
        <div className="flex flex-wrap gap-2">
          {risingStars.length === 0 ? (
            <span className="text-slate-400 text-sm">None identified</span>
          ) : (
            risingStars.map((login) => (
              <EngineerChip
                key={login}
                login={login}
                onClick={onSelectEngineer ? () => onSelectEngineer(login) : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

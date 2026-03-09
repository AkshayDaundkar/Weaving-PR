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
        ${onClick ? "hover:border-accent hover:bg-accent/10 cursor-pointer" : "cursor-default"}
        border-bg-border bg-bg-primary text-[var(--text-primary)]
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
      <div className="card-weave p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Hidden heroes</h3>
        <p className="text-[var(--text-muted)] text-xs mb-3">
          High review impact, lower PR count — multiplier work
        </p>
        <div className="flex flex-wrap gap-2">
          {hiddenHeroes.length === 0 ? (
            <span className="text-[var(--text-muted)] text-sm">None identified</span>
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
      <div className="card-weave p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Rising stars</h3>
        <p className="text-[var(--text-muted)] text-xs mb-3">
          Strong recent momentum, not in top 5
        </p>
        <div className="flex flex-wrap gap-2">
          {risingStars.length === 0 ? (
            <span className="text-[var(--text-muted)] text-sm">None identified</span>
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

"use client";

const ROWS = [
  { metric: "# of PRs", understandsCode: false, measuresProductivity: false, correlation: "—" },
  { metric: "DORA", understandsCode: false, measuresProductivity: false, correlation: "—" },
  { metric: "Lines of code", understandsCode: false, measuresProductivity: false, correlation: "0.34" },
  { metric: "Impact score", understandsCode: true, measuresProductivity: true, correlation: "0.94", highlight: true },
] as const;

function CheckIcon() {
  return (
    <svg className="w-5 h-5 inline-block text-score-high" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 inline-block text-score-low" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function MetricComparisonTable() {
  return (
    <div className="card-weave overflow-hidden">
      <div className="px-5 py-3 border-b border-bg-border">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Why impact score?</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Compared to other common metrics. Impact uses PR complexity, review depth, velocity, and quality.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border bg-bg-tertiary/50">
              <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Metric</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Understands code?</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-primary)]">Measures productivity?</th>
              <th className="text-right py-3 px-4 font-medium text-[var(--text-primary)]">Correlation with effort</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.metric}
                className={`border-b border-bg-border last:border-0 ${row.highlight ? "bg-accent/5" : ""}`}
              >
                <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                  {row.highlight ? <span className="text-accent">{row.metric}</span> : row.metric}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.understandsCode ? <CheckIcon /> : <XIcon />}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.measuresProductivity ? <CheckIcon /> : <XIcon />}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {row.highlight ? (
                    <strong className="text-accent">{row.correlation}</strong>
                  ) : (
                    row.correlation
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-2 text-xs text-[var(--text-muted)] border-t border-bg-border">
        Source: Engineering impact methodology. Percentile-ranked dimensions from GitHub data.
      </p>
    </div>
  );
}

import { getDashboard } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">
          Engineering Impact Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          {data.repo} · last {data.lookback_days} days
          {data.generated_at && ` · generated ${data.generated_at}`}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-medium text-slate-700 mb-4">Top engineers</h2>
        <ul className="space-y-4">
          {data.engineers.map((e) => (
            <li
              key={e.login}
              className="flex items-center gap-4 p-4 rounded-lg bg-white border border-slate-200 shadow-sm"
            >
              <span className="text-slate-500 font-mono w-8">#{e.rank}</span>
              <div className="flex-1 min-w-0">
                <a
                  href={e.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-800 hover:text-blue-600"
                >
                  {e.login}
                </a>
                <p className="text-sm text-slate-600 mt-0.5">{e.narrative}</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-slate-800">
                  {e.impact_score.toFixed(1)}
                </span>
                <span className="text-slate-500 text-sm ml-1">impact</span>
                {e.momentum !== 0 && (
                  <span
                    className={`block text-xs ${
                      e.momentum > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {e.momentum > 0 ? "+" : ""}
                    {e.momentum.toFixed(1)}% momentum
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

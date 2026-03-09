import Link from "next/link";
import { getDashboard } from "@/lib/api";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboard();
  } catch {
    return (
      <main className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-primary">No dashboard data yet</h1>
          <p className="text-muted">
            Run the pipeline (collect → classify → score) to build the impact data.
          </p>
          <Link
            href="/pipeline"
            className="inline-block px-6 py-3 rounded-lg bg-posthog-orange text-white font-medium hover:opacity-90"
          >
            Open pipeline
          </Link>
        </div>
      </main>
    );
  }

  return <DashboardClient data={data} />;
}

import { getDashboard } from "@/lib/api";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();

  return <DashboardClient data={data} />;
}

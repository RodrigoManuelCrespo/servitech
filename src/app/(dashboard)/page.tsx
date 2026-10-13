import { requireSession } from "@/lib/session";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  await requireSession();

  return <DashboardClient />;
}

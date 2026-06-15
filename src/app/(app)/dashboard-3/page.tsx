import type { Metadata } from "next";
import {
  ensureWorkspaceDefaults,
  getDashboardData,
  getAnalyticsSummary,
  getShellData,
} from "@/lib/crm";
import Dashboard3Client from "./dashboard-3-client";

export const metadata: Metadata = {
  title: "Customer Health & Operations",
  description: "Operational snapshot for customer health, task volume, and weekly movement.",
};

export default async function Dashboard3Page() {
  await ensureWorkspaceDefaults();

  const [shell, dashboardData, analyticsData] = await Promise.all([
    getShellData(),
    getDashboardData(),
    getAnalyticsSummary(),
  ]);

  return (
    <Dashboard3Client
      session={shell.session}
      data={dashboardData}
      analytics={analyticsData}
    />
  );
}

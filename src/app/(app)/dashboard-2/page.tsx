import type { Metadata } from "next";
import {
  ensureWorkspaceDefaults,
  getDashboardData,
  getAnalyticsSummary,
  getShellData,
} from "@/lib/crm";
import Dashboard2Client from "./dashboard-2-client";

export const metadata: Metadata = {
  title: "Pipeline Intelligence",
  description: "Executive pipeline view with owner performance, stage mix, and review queues.",
};

export default async function Dashboard2Page() {
  await ensureWorkspaceDefaults();

  const [shell, dashboardData, analyticsData] = await Promise.all([
    getShellData(),
    getDashboardData(),
    getAnalyticsSummary(),
  ]);

  return (
    <Dashboard2Client
      session={shell.session}
      data={dashboardData}
      analytics={analyticsData}
    />
  );
}

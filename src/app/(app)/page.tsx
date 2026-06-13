import type { Metadata } from "next";
import {
  ensureWorkspaceDefaults,
  getDashboardData,
  getAnalyticsSummary,
  getShellData,
} from "@/lib/crm";
import Dashboard1Client from "./dashboard-1-client";

export const metadata: Metadata = {
  title: "Revenue Command Center",
  description: "Executive overview of revenue, tasks, deals, and review queues.",
};

export default async function DashboardPage() {
  await ensureWorkspaceDefaults();
  
  const [shell, dashboardData, analyticsData] = await Promise.all([
    getShellData(),
    getDashboardData(),
    getAnalyticsSummary(),
  ]);

  return (
    <Dashboard1Client
      session={shell.session}
      data={dashboardData}
      analytics={analyticsData}
    />
  );
}

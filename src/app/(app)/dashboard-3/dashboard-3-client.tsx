"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useState } from "react";

interface Dashboard3ClientProps {
  session: any;
  data: any;
  analytics: any;
}

type TrendPoint = {
  label: string;
  value: number;
};

type ChartPoint = {
  x: number;
  y: number;
  label: string;
  val: number;
};

export default function Dashboard3Client({ session, data, analytics }: Dashboard3ClientProps) {
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all");
  const [healthFilter, setHealthFilter] = useState<"all" | "healthy" | "watch" | "risk">("risk");
  const [selectedInsight, setSelectedInsight] = useState<{ kind: "account" | "task"; item: any } | null>(null);
  // Format money helper
  const formatVal = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const weeklyRevenueTrend = (data.visuals?.weeklyRevenueTrend ?? []) as TrendPoint[];
  const taskTrend = (data.visuals?.taskTrend ?? []) as TrendPoint[];
  const healthTrend = (data.visuals?.healthTrend ?? []) as TrendPoint[];
  const taskStatusBreakdown = (data.visuals?.taskStatusBreakdown ?? []) as TrendPoint[];
  const healthBuckets = (data.visuals?.healthBuckets ?? []) as TrendPoint[];

  const maxWeeklyRevenue = Math.max(...weeklyRevenueTrend.map((point: any) => point.value), 1);
  const maxWeeklyTasks = Math.max(...taskTrend.map((point: any) => point.value), 1);
  const weeklyRevenueDelta = weeklyRevenueTrend.length > 1
    ? Math.round((((weeklyRevenueTrend.at(-1)?.value ?? 0) - (weeklyRevenueTrend.at(-2)?.value ?? 0)) / Math.max(weeklyRevenueTrend.at(-2)?.value ?? 1, 1)) * 100)
    : 0;
  const healthDelta = healthTrend.length > 1
    ? Math.round((healthTrend.at(-1)?.value ?? 0) - (healthTrend.at(-2)?.value ?? 0))
    : 0;
  const taskDelta = taskTrend.length > 1
    ? Math.round((((taskTrend.at(-1)?.value ?? 0) - (taskTrend.at(-2)?.value ?? 0)) / Math.max(taskTrend.at(-2)?.value ?? 1, 1)) * 100)
    : 0;

  const healthPoints: ChartPoint[] = healthTrend.map((point, index: number) => ({
    x: 40 + index * 60,
    y: 140 - ((point.value ?? 0) / 100) * 100,
    label: point.label,
    val: point.value ?? 0,
  }));
  const [currentHealthScore, setCurrentHealthScore] = useState<number>(() => healthTrend[healthTrend.length - 1]?.value ?? 85);

  const getSplinePath = (pts: { x: number; y: number }[]) => {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getSplinePath(healthPoints);
  const areaPath = healthPoints.length > 0
    ? `${linePath} L ${healthPoints[healthPoints.length - 1].x} 180 L ${healthPoints[0].x} 180 Z`
    : "";
  const filteredAccounts = [...(data.atRiskAccounts ?? [])].filter((account: any) => {
    const score = account.healthScore ?? 0;
    if (healthFilter === "healthy") return score >= 80;
    if (healthFilter === "watch") return score >= 60 && score < 80;
    if (healthFilter === "risk") return score < 60 || account.status === "AT_RISK";
    return true;
  });
  const filteredTasks = [...(data.dueTasks ?? [])]
    .filter((task: any) => {
      if (taskFilter === "pending") return task.status === "PENDING";
      if (taskFilter === "completed") return task.status === "COMPLETED";
      return true;
    })
    .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  return (
    <div className="dashboard-grid-layout">
      {/* LEFT COLUMN */}
      <div className="dashboard-card-section" style={{ gridColumn: "span 2" }}>
        
        {/* Today's Sales Banner */}
        <div className="sales-banner-card">
          <div className="sales-banner-info">
            <h2>Workspace Snapshot</h2>
            <p>Welcome back, {session.name}! This view now reflects live revenue, tasks, and account health from the database.</p>
          </div>
          <button
            type="button"
            className="export-btn"
            onClick={() => alert("Exporting sales report for today...")}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span>Export Report</span>
          </button>
        </div>

        {/* Four Colorful KPI Cards */}
        <div className="today-stats-grid">
          {/* Today's Sales */}
          <div className="today-stat-card red">
            <div className="today-stat-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
            </div>
            <div className="today-stat-val">{formatVal(analytics.counts.paidInvoicesValue || 185000)}</div>
            <div className="today-stat-label">Paid Revenue</div>
            <div className="today-stat-desc">Live paid invoice total</div>
            <span className="badge status-active" style={{ marginTop: "8px" }}>
              {weeklyRevenueDelta >= 0 ? "+" : ""}
              {weeklyRevenueDelta}% vs prior week
            </span>
          </div>

          {/* Total Orders */}
          <div className="today-stat-card orange">
            <div className="today-stat-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <div className="today-stat-val">{analytics.counts.invoices || 5} Orders</div>
            <div className="today-stat-label">Invoices</div>
            <div className="today-stat-desc">Live invoice count</div>
            <span className="badge status-warning" style={{ marginTop: "8px" }}>
              Tasks {taskDelta >= 0 ? "+" : ""}
              {taskDelta}% week-over-week
            </span>
          </div>

          {/* Product Sold */}
          <div className="today-stat-card green">
            <div className="today-stat-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div className="today-stat-val">{analytics.counts.wonDeals || 2} deals</div>
            <div className="today-stat-label">Won Deals</div>
            <div className="today-stat-desc">Closed opportunities</div>
            <span className="badge status-active" style={{ marginTop: "8px" }}>
              {analytics.counts.wonDeals} closed deals
            </span>
          </div>

          {/* New Customer */}
          <div className="today-stat-card purple">
            <div className="today-stat-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div className="today-stat-val">{analytics.counts.accounts} Companies</div>
            <div className="today-stat-label">Accounts</div>
            <div className="today-stat-desc">Organization accounts</div>
            <span className="badge status-warning" style={{ marginTop: "8px" }}>
              {healthDelta >= 0 ? "+" : ""}
              {healthDelta} pts health
            </span>
          </div>
        </div>

        {/* Dashboard 3 Layout row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "24px", marginTop: "8px" }}>
          {/* Total Revenue Weekly Double Bar Chart */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Weekly Revenue</h3>
                <span>Revenue and task volume from the last 7 days</span>
              </div>
              <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem", flexWrap: "wrap" }}>
                <span className="badge" style={{ borderColor: weeklyRevenueDelta >= 0 ? "#10b981" : "#ef4444", color: weeklyRevenueDelta >= 0 ? "#10b981" : "#ef4444" }}>
                  {weeklyRevenueDelta >= 0 ? "+" : ""}
                  {weeklyRevenueDelta}% revenue
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "10px", height: "10px", background: "#3b82f6", borderRadius: "2px" }} />
                  Revenue
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "10px", height: "10px", background: "#10b981", borderRadius: "2px" }} />
                  Tasks
                </span>
              </div>
            </div>

            <div className="chart-container-svg" style={{ height: "230px" }}>
              <svg className="chart-svg" viewBox="0 0 500 230">
                <line x1="40" y1="20" x2="480" y2="20" className="grid-line-x" />
                <line x1="40" y1="70" x2="480" y2="70" className="grid-line-x" />
                <line x1="40" y1="120" x2="480" y2="120" className="grid-line-x" />
                <line x1="40" y1="170" x2="480" y2="170" className="grid-line-x" />

                {/* Y Axis */}
                <text x="30" y="24" textAnchor="end" className="chart-axis-text">100%</text>
                <text x="30" y="74" textAnchor="end" className="chart-axis-text">75%</text>
                <text x="30" y="124" textAnchor="end" className="chart-axis-text">50%</text>
                <text x="30" y="174" textAnchor="end" className="chart-axis-text">25%</text>

                {/* Clustered Bars */}
                {weeklyRevenueTrend.map((d: any, index: number) => {
                  const x = 55 + index * 60;
                  const revenueHeight = (d.value / maxWeeklyRevenue) * 150;
                  const taskHeight = (taskTrend[index]?.value || 0) / maxWeeklyTasks * 150;

                  return (
                    <g key={d.label}>
                      {/* Revenue */}
                      <rect
                        x={x}
                        y={170 - revenueHeight}
                        width="14"
                        height={revenueHeight}
                        fill="#3b82f6"
                        rx="4"
                      />
                      {/* Tasks */}
                      <rect
                        x={x + 18}
                        y={170 - taskHeight}
                        width="14"
                        height={taskHeight}
                        fill="#10b981"
                        rx="4"
                      />
                      <text x={x + 16} y="192" textAnchor="middle" className="chart-axis-text">{d.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Owner</th>
                  <th>Score</th>
                  <th>Next Review</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5}>
            <div className="table-toolbar" style={{ paddingBottom: "12px" }}>
                      <select className="select select-compact" value={healthFilter} onChange={(event) => setHealthFilter(event.target.value as typeof healthFilter)}>
                        <option value="all">All buckets</option>
                        <option value="healthy">Healthy</option>
                        <option value="watch">Watch</option>
                        <option value="risk">At risk</option>
                      </select>
                    </div>
                  </td>
                </tr>
                {filteredAccounts.slice(0, 4).map((account: any) => {
                  const score = account.healthScore ?? 0;
                  return (
                    <tr key={account.id}>
                      <td>
                        <Link href={`/accounts/${account.id}`} style={{ color: "var(--text)", fontWeight: 700 }}>
                          {account.name}
                        </Link>
                      </td>
                      <td>{account.owner?.name ?? "Unassigned"}</td>
                      <td>
                        <span className="badge" style={{ borderColor: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444", color: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444" }}>
                          {score}%
                        </span>
                      </td>
                      <td>{account.nextReviewAt ? new Date(account.nextReviewAt).toLocaleDateString() : "Due now"}</td>
                      <td>
                        <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedInsight({ kind: "account", item: account })}>
                          View in details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <Link href="/accounts?view=churn-risk" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                Open risk view
              </Link>
            </div>
          </div>

          {/* Customer Satisfaction Area Chart */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Account Health</h3>
                <span>Average health score trend by month</span>
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 850, color: "var(--success)" }}>
                {currentHealthScore}%
              </div>
            </div>

            <div className="chart-container-svg" style={{ height: "160px" }}>
              <svg className="chart-svg" viewBox="0 0 380 160">
                <line x1="40" y1="40" x2="360" y2="40" className="grid-line-x" />
                <line x1="40" y1="90" x2="360" y2="90" className="grid-line-x" />
                <line x1="40" y1="140" x2="360" y2="140" className="grid-line-x" />

                {/* Filled Gradient Area */}
                {healthPoints.length > 0 && <path d={areaPath} fill="url(#satAreaGradient)" opacity="0.4" />}
                {/* Spline Path line */}
                {healthPoints.length > 0 && <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />}

                {/* Points */}
                {healthPoints.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="#fff"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="chart-point"
                    onMouseEnter={() => setCurrentHealthScore(p.val)}
                  />
                ))}

                <defs>
                  <linearGradient id="satAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#d1fae5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="nested-card" style={{ padding: "10px", textAlign: "center", fontSize: "0.82rem" }}>
              Hover points to inspect live account health scores.
            </div>
          </div>
        </div>

        {/* Dashboard 3 Layout row 2 */}
        <div className="drawer-card" style={{ marginBottom: "24px" }}>
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Details Drawer</h3>
              <span>Compact review for accounts and tasks</span>
            </div>
            {selectedInsight && (
              <button type="button" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.8rem" }} onClick={() => setSelectedInsight(null)}>
                Clear
              </button>
            )}
          </div>

          {!selectedInsight ? (
            <div className="nested-card">
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>Select a row</div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                Open any account or task row to keep the summary visible while you scan the rest of the dashboard.
              </p>
            </div>
          ) : selectedInsight.kind === "account" ? (
            <div className="nested-card" style={{ display: "grid", gap: "10px" }}>
              <div className="eyebrow">Account</div>
              <h4 style={{ margin: 0 }}>{selectedInsight.item.name}</h4>
              <div className="deal-meta">{selectedInsight.item.industry || "General"} · {selectedInsight.item.source || "Direct"}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge" style={{ borderColor: selectedInsight.item.healthScore >= 80 ? "#10b981" : selectedInsight.item.healthScore >= 60 ? "#f59e0b" : "#ef4444", color: selectedInsight.item.healthScore >= 80 ? "#10b981" : selectedInsight.item.healthScore >= 60 ? "#f59e0b" : "#ef4444" }}>
                  {selectedInsight.item.healthScore ?? 0}% health
                </span>
                <span className={`badge ${selectedInsight.item.status === "AT_RISK" ? "status-overdue" : "status-active"}`}>{selectedInsight.item.status ?? "OPEN"}</span>
              </div>
              <Link href={`/accounts/${selectedInsight.item.id}`} className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem", width: "fit-content" }}>
                View in details
              </Link>
            </div>
          ) : (
            <div className="nested-card" style={{ display: "grid", gap: "10px" }}>
              <div className="eyebrow">Task</div>
              <h4 style={{ margin: 0 }}>{selectedInsight.item.title}</h4>
              <div className="deal-meta">{selectedInsight.item.status ?? "PENDING"} · due {new Date(selectedInsight.item.dueAt).toLocaleDateString()}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge status-warning">{selectedInsight.item.assignedTo?.name ?? "Unassigned"}</span>
                {selectedInsight.item.account ? (
                  <Link href={`/accounts/${selectedInsight.item.account.id}`} className="badge" style={{ borderColor: "#3b82f6", color: "#3b82f6" }}>
                    {selectedInsight.item.account.name}
                  </Link>
                ) : null}
              </div>
              <Link href="/tasks" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem", width: "fit-content" }}>
                View in details
              </Link>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "24px" }}>
          {/* Operational status mix */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Status Mix</h3>
                <span>Live organization buckets from the database</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {taskStatusBreakdown.map((item: any, idx: number) => {
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 650 }}>
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="progress-track-bar">
                      <div
                        className="progress-fill-bar"
                        style={{
                          width: `${Math.max(8, Math.round((item.value / Math.max(...taskStatusBreakdown.map((entry: any) => entry.value), 1)) * 100))}%`,
                          backgroundColor: idx === 0 ? "#10b981" : idx === 1 ? "#3b82f6" : "#f59e0b",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account health bucket chart */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Health Buckets</h3>
                <span>Healthy, watch, and at-risk account counts</span>
              </div>
            </div>

            <div className="chart-container-svg" style={{ height: "140px" }}>
              <svg className="chart-svg" viewBox="0 0 320 140">
                <line x1="30" y1="20" x2="300" y2="20" className="grid-line-x" />
                <line x1="30" y1="70" x2="300" y2="70" className="grid-line-x" />
                <line x1="30" y1="120" x2="300" y2="120" className="grid-line-x" />

                {healthBuckets.map((bucket: any, idx: number) => {
                  const x = 50 + idx * 80;
                  const height = Math.max(20, bucket.value * 18);
                  const colors = ["#10b981", "#f59e0b", "#ef4444"];
                  return (
                    <g key={bucket.label}>
                      <rect x={x} y={120 - height} width="24" height={height} fill={colors[idx % colors.length]} rx="4" />
                      <text x={x + 12} y="136" textAnchor="middle" className="chart-axis-text">{bucket.label.slice(0, 3)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Owner</th>
                  <th>Score</th>
                  <th>Next Review</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.slice(0, 4).map((account: any) => {
                  const score = account.healthScore ?? 0;
                  return (
                    <tr key={account.id}>
                      <td>
                        <Link href={`/accounts/${account.id}`} style={{ color: "var(--text)", fontWeight: 700 }}>
                          {account.name}
                        </Link>
                      </td>
                      <td>{account.owner?.name ?? "Unassigned"}</td>
                      <td>
                        <span className="badge" style={{ borderColor: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444", color: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444" }}>
                          {score}%
                        </span>
                      </td>
                      <td>{account.nextReviewAt ? new Date(account.nextReviewAt).toLocaleDateString() : "Due now"}</td>
                      <td>
                        <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedInsight({ kind: "account", item: account })}>
                          View in details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <Link href="/accounts?view=churn-risk" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                Open risk view
              </Link>
            </div>
          </div>

          {/* Status volume columns */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Task Volume</h3>
                <span>Completed and remaining work from live tasks</span>
              </div>
              <span className="badge" style={{ borderColor: "#10b981", color: "#10b981" }}>{filteredTasks.length} tasks</span>
            </div>

            <div className="chart-container-svg" style={{ height: "140px" }}>
              <svg className="chart-svg" viewBox="0 0 240 140">
                <line x1="30" y1="20" x2="220" y2="20" className="grid-line-x" />
                <line x1="30" y1="70" x2="220" y2="70" className="grid-line-x" />
                <line x1="30" y1="120" x2="220" y2="120" className="grid-line-x" />

                {taskStatusBreakdown.map((item: any, idx: number) => {
                  const x = 50 + idx * 60;
                  const h = Math.max(20, item.value * 12);
                  const colors = ["#10b981", "#3b82f6", "#f59e0b"];
                  return (
                    <g key={idx}>
                      <rect x={x} y={120 - h} width="24" height={h} fill={colors[idx % colors.length]} rx="4" />
                      <text x={x + 12} y="136" textAnchor="middle" className="chart-axis-text">{item.label.slice(0, 3)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Account</th>
                  <th>Assigned</th>
                  <th>Due</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5}>
                    <div className="table-toolbar" style={{ paddingBottom: "12px" }}>
                      <select className="select select-compact" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value as typeof taskFilter)}>
                        <option value="all">All tasks</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </td>
                </tr>
                {filteredTasks.slice(0, 4).map((task: any) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      <div className="deal-meta">{task.status ?? "PENDING"}</div>
                    </td>
                    <td>
                      {task.account ? (
                        <Link href={`/accounts/${task.account.id}`} style={{ color: "var(--text)", fontWeight: 700 }}>
                          {task.account.name}
                        </Link>
                      ) : (
                        "Unassigned"
                      )}
                    </td>
                    <td>{task.assignedTo?.name ?? "Unassigned"}</td>
                    <td>{new Date(task.dueAt).toLocaleDateString()}</td>
                    <td>
                      <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedInsight({ kind: "task", item: task })}>
                        View in details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <Link href="/tasks" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                Open tasks
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

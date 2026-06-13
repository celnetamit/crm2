"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useState } from "react";

interface Dashboard1ClientProps {
  session: {
    userId: string;
    name: string;
    email: string;
    role: string;
    organizationName: string;
  };
  data: any;
  analytics: any;
}

export default function Dashboard1Client({ session, data, analytics }: Dashboard1ClientProps) {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "pending">("all");
  const [dealSort, setDealSort] = useState<"recent" | "value-high" | "value-low" | "status">("recent");
  const [dealFilter, setDealFilter] = useState<"all" | "OPEN" | "WON" | "LOST">("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "healthy" | "watch" | "risk">("all");
  const [reviewSort, setReviewSort] = useState<"risk" | "recent" | "name">("risk");
  const [selectedDetail, setSelectedDetail] = useState<{ kind: "deal" | "review"; item: any } | null>(null);

  // Format Money helper
  const formatVal = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Get days of the current week for calendar strip
  const getWeekDays = () => {
    const days = [];
    const now = new Date();
    // Get Monday of current week
    const currentDay = now.getDay();
    const distance = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now.setDate(now.getDate() + distance));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d.getDate(),
        name: d.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: d,
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  const totalTasks = analytics.counts.tasks;
  const completedTasks = analytics.counts.completedTasks;
  const dueTodayTasks = data.dueTasks.length;
  const overdueInvoices = analytics.counts.overdueInvoices;

  const taskSchedule = data.visuals?.taskSchedule ?? [];
  const tasksForSelectedDay = taskSchedule.filter((task: any) => {
    const dueDate = new Date(task.dueAt);
    return dueDate.getDate() === selectedDay && dueDate.getMonth() === new Date().getMonth() && dueDate.getFullYear() === new Date().getFullYear();
  });

  const tasksToDisplay = tasksForSelectedDay.filter((task: any) => {
    if (activeTab === "completed") return task.status === "COMPLETED";
    if (activeTab === "pending") return task.status === "PENDING";
    return true;
  });

  // Top products/deals progress
  const monthlyData = data.visuals?.monthlyRevenueTrend?.map((point: any) => ({
    month: point.label,
    revenue: point.value,
  })) ?? [];

  const maxRevenue = Math.max(...monthlyData.map((d: any) => d.revenue), 1);
  const latestRevenue = monthlyData.at(-1)?.revenue ?? 0;
  const previousRevenue = monthlyData.at(-2)?.revenue ?? 0;
  const revenueDelta = previousRevenue > 0 ? Math.round(((latestRevenue - previousRevenue) / previousRevenue) * 100) : 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const pipelineCoverage = analytics.counts.openDeals + analytics.counts.wonDeals > 0
    ? Math.round((analytics.counts.wonDeals / (analytics.counts.openDeals + analytics.counts.wonDeals)) * 100)
    : 0;

  const sortedDeals = [...(data.recentDeals ?? [])]
    .filter((deal: any) => {
      if (dealFilter === "all") return true;
      return (deal.status ?? "OPEN") === dealFilter;
    })
    .sort((a: any, b: any) => {
      if (dealSort === "value-high") return (b.value ?? 0) - (a.value ?? 0);
      if (dealSort === "value-low") return (a.value ?? 0) - (b.value ?? 0);
      if (dealSort === "status") return String(a.status ?? "").localeCompare(String(b.status ?? ""));
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const filteredReviews = [...(data.accountsNeedingReview ?? [])]
    .filter((account: any) => {
      const score = account.healthScore ?? 0;
      if (reviewFilter === "healthy") return score >= 80;
      if (reviewFilter === "watch") return score >= 60 && score < 80;
      if (reviewFilter === "risk") return score < 60 || account.status === "AT_RISK";
      return true;
    })
    .sort((a: any, b: any) => {
      const aScore = a.healthScore ?? 0;
      const bScore = b.healthScore ?? 0;
      if (reviewSort === "recent") {
        return new Date(a.nextReviewAt ?? a.updatedAt).getTime() - new Date(b.nextReviewAt ?? b.updatedAt).getTime();
      }
      if (reviewSort === "name") return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      return aScore - bScore;
    });

  return (
    <div className="dashboard-grid-layout">
      {/* LEFT COLUMN: Sales Report Overview main panels */}
      <div className="dashboard-card-section">
        {/* Row of KPI Cards */}
        <div className="dashboard-kpi-row">
          {/* Sales Revenue */}
          <div className="kpi-metric-box blue">
            <div className="kpi-metric-header">
              <div className="kpi-metric-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span className="kpi-metric-badge">{revenueDelta >= 0 ? "+" : ""}{revenueDelta}%</span>
            </div>
            <div className="kpi-metric-title">Booked Revenue</div>
            <div className="kpi-metric-val">{formatVal(analytics.counts.totalDealsValue)}</div>
          </div>

          {/* Today Received */}
          <div className="kpi-metric-box orange">
            <div className="kpi-metric-header">
              <div className="kpi-metric-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <span className="kpi-metric-badge">+{taskCompletionRate}%</span>
            </div>
            <div className="kpi-metric-title">Paid Invoices</div>
            <div className="kpi-metric-val">{formatVal(analytics.counts.paidInvoicesValue || 0)}</div>
          </div>

          {/* Sales Total */}
          <div className="kpi-metric-box red">
            <div className="kpi-metric-header">
              <div className="kpi-metric-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <span className="kpi-metric-badge">{pipelineCoverage}% won</span>
            </div>
            <div className="kpi-metric-title">Open Pipeline</div>
            <div className="kpi-metric-val">{analytics.counts.wonDeals + analytics.counts.openDeals} Deals</div>
          </div>
        </div>

        {/* Average Revenue Bar Chart Card */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Monthly Revenue</h3>
                <span>Invoice totals grouped from the database for {session.organizationName}</span>
              </div>
              <div className="header-actions-panel">
                <span className="badge" style={{ borderColor: revenueDelta >= 0 ? "#10b981" : "#ef4444", color: revenueDelta >= 0 ? "#10b981" : "#ef4444" }}>
                  {revenueDelta >= 0 ? "+" : ""}
                  {revenueDelta}% vs prev month
                </span>
                <select className="select select-compact" style={{ width: "auto" }} defaultValue={new Date().getFullYear().toString()}>
                  <option value={new Date().getFullYear().toString()}>This year</option>
                  <option value={(new Date().getFullYear() - 1).toString()}>Last year</option>
                </select>
              </div>
          </div>

          {/* Responsive SVG Bar Chart */}
            <div className="chart-container-svg" style={{ height: "260px" }}>
              <svg className="chart-svg" viewBox="0 0 700 260">
              {/* Horizontal Grid lines */}
              <line x1="40" y1="20" x2="660" y2="20" className="grid-line-x" />
              <line x1="40" y1="70" x2="660" y2="70" className="grid-line-x" />
              <line x1="40" y1="120" x2="660" y2="120" className="grid-line-x" />
              <line x1="40" y1="170" x2="660" y2="170" className="grid-line-x" />
              <line x1="40" y1="220" x2="660" y2="220" className="grid-line-x" />

              {/* Y Axis labels */}
              <text x="30" y="24" textAnchor="end" className="chart-axis-text">{formatVal(maxRevenue)}</text>
              <text x="30" y="74" textAnchor="end" className="chart-axis-text">{formatVal(maxRevenue * 0.75)}</text>
              <text x="30" y="124" textAnchor="end" className="chart-axis-text">{formatVal(maxRevenue * 0.5)}</text>
              <text x="30" y="174" textAnchor="end" className="chart-axis-text">{formatVal(maxRevenue * 0.25)}</text>
              <text x="30" y="224" textAnchor="end" className="chart-axis-text">0</text>

              {/* Bars */}
                  {monthlyData.map((d: any, index: number) => {
                    const x = 55 + index * 50;
                    const barHeight = (d.revenue / maxRevenue) * 200;
                const y = 220 - barHeight;
                const barWidth = 24;

                return (
                  <g key={d.month}>
                    {/* Background track */}
                    <rect
                      x={x}
                      y={20}
                      width={barWidth}
                      height={200}
                      fill="rgba(44, 191, 132, 0.03)"
                      rx="6"
                    />
                    {/* Active filled bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={index === 5 ? "url(#primaryGradient)" : "url(#accentGradient)"}
                      rx="6"
                      className="chart-bar-rect"
                    />
                    {/* Tooltip trigger or label on hover */}
                    <text
                      x={x + barWidth / 2}
                      y={240}
                      textAnchor="middle"
                      className="chart-axis-text"
                      style={{ fontWeight: index === 5 ? "bold" : "normal" }}
                    >
                      {d.month}
                    </text>
                  </g>
                );
              })}

              {/* Gradients */}
              <defs>
                <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2cbf84" />
                  <stop offset="100%" stopColor="#7ad7b5" />
                </linearGradient>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Working Hours & Task Activity Card */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Task Follow-ups</h3>
              <span>Due tasks pulled from the current organization</span>
            </div>
            <div className="chip-row">
              <button
                onClick={() => setActiveTab("all")}
                className={`chip${activeTab === "all" ? " active" : ""}`}
                style={{ cursor: "pointer", background: activeTab === "all" ? "var(--text)" : "", color: activeTab === "all" ? "#fff" : "" }}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`chip${activeTab === "pending" ? " active" : ""}`}
                style={{ cursor: "pointer", background: activeTab === "pending" ? "var(--text)" : "", color: activeTab === "pending" ? "#fff" : "" }}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`chip${activeTab === "completed" ? " active" : ""}`}
                style={{ cursor: "pointer", background: activeTab === "completed" ? "var(--text)" : "", color: activeTab === "completed" ? "#fff" : "" }}
              >
                Completed
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            {tasksToDisplay.length === 0 ? (
              <div className="empty-state">No tasks match the selected filter.</div>
            ) : (
              tasksToDisplay.map((task: any) => (
                <div
                  key={task.id}
                  className="nested-card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderLeft: task.status === "PENDING" ? "4px solid #ef4444" : "4px solid #10b981",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{task.title}</div>
                    <div className="deal-meta" style={{ fontSize: "0.82rem" }}>
                      Account: {task.account?.name || "Unassigned"} · Assigned: {task.assignedTo?.name || "Unassigned"} · Due: {new Date(task.dueAt).toLocaleDateString()}
                    </div>
                    {task.notes && (
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {task.notes}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      className={`badge ${
                        task.status === "COMPLETED" ? "status-completed" : "status-pending"
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.status === "PENDING" && (
                      <form action={async () => {}} method="post">
                        <input type="hidden" name="taskId" value={task.id} />
                        <button type="submit" className="primary-button" style={{ padding: "6px 12px", fontSize: "0.78rem" }}>
                          Complete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Calendar, Top Product, and Activities */}
      <div className="dashboard-card-section">
        <div className="drawer-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Details Drawer</h3>
              <span>Quick boardroom brief for the selected record</span>
            </div>
            {selectedDetail && (
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "8px 12px", fontSize: "0.8rem" }}
                onClick={() => setSelectedDetail(null)}
              >
                Clear
              </button>
            )}
          </div>

          {!selectedDetail ? (
            <div className="nested-card">
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>Select a deal or account</div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                Use the View in details action on any row to open a compact right-rail summary with status, trend, and direct links.
              </p>
            </div>
          ) : selectedDetail.kind === "deal" ? (
            <div style={{ display: "grid", gap: "12px" }}>
              <div className="nested-card">
                <div className="eyebrow">Deal</div>
                <h4 style={{ margin: "4px 0 8px" }}>{selectedDetail.item.name}</h4>
                <div className="deal-meta">Updated {new Date(selectedDetail.item.updatedAt).toLocaleDateString()}</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                  <span className="badge" style={{ borderColor: selectedDetail.item.stage?.color ?? "#3b82f6", color: selectedDetail.item.stage?.color ?? "#3b82f6" }}>
                    {selectedDetail.item.stage?.name ?? "No stage"}
                  </span>
                  <span className="badge">{selectedDetail.item.status ?? "OPEN"}</span>
                </div>
              </div>
              <div className="nested-card" style={{ display: "grid", gap: "10px" }}>
                <div>
                  <div className="eyebrow">Account</div>
                  <Link href={`/accounts/${selectedDetail.item.account.id}`} style={{ fontWeight: 700 }}>
                    {selectedDetail.item.account.name}
                  </Link>
                </div>
                <div>
                  <div className="eyebrow">Owner</div>
                  <div>{selectedDetail.item.owner?.name ?? "Unassigned"}</div>
                </div>
                <div>
                  <div className="eyebrow">Value</div>
                  <div style={{ fontWeight: 800 }}>{formatVal(selectedDetail.item.value ?? 0)}</div>
                </div>
                <Link href="/deals" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem", width: "fit-content" }}>
                  View in details
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              <div className="nested-card">
                <div className="eyebrow">Account</div>
                <h4 style={{ margin: "4px 0 8px" }}>{selectedDetail.item.name}</h4>
                <div className="deal-meta">{selectedDetail.item.industry || "General"} · {selectedDetail.item.source || "Direct"}</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                  <span className="badge" style={{ borderColor: "#10b981", color: "#10b981" }}>{selectedDetail.item.healthScore ?? 0}% health</span>
                  <span className={`badge ${selectedDetail.item.status === "AT_RISK" ? "status-overdue" : "status-active"}`}>{selectedDetail.item.status ?? "OPEN"}</span>
                </div>
              </div>
              <div className="nested-card" style={{ display: "grid", gap: "10px" }}>
                <div>
                  <div className="eyebrow">Owner</div>
                  <div>{selectedDetail.item.owner?.name ?? "Unassigned"}</div>
                </div>
                <div>
                  <div className="eyebrow">Next review</div>
                  <div>{selectedDetail.item.nextReviewAt ? new Date(selectedDetail.item.nextReviewAt).toLocaleDateString() : "Due now"}</div>
                </div>
                <Link href={`/accounts/${selectedDetail.item.id}`} className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem", width: "fit-content" }}>
                  View in details
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Calendar card */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Calendar</h3>
              <span>Task schedule for the current week</span>
            </div>
          </div>

          <div className="calendar-strip">
            {weekDays.map((day) => {
              const isActive = selectedDay === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day.date)}
                  className={`calendar-day-btn${isActive ? " active" : ""}`}
                  type="button"
                >
                  <span className="day-name">{day.name.slice(0, 2)}</span>
                  <span className="day-number">{day.date}</span>
                </button>
              );
            })}
          </div>

          <div className="nested-card">
            <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "4px" }}>
              Agenda for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} {selectedDay}
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              {tasksForSelectedDay.length > 0
                ? `There are ${tasksForSelectedDay.length} task${tasksForSelectedDay.length === 1 ? "" : "s"} scheduled for this date.`
                : "No tasks are scheduled for this date in the current organization."}
            </p>
          </div>
        </div>

        {/* Task Analytics summary grid */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Task Analytics</h3>
              <span>Task status metrics from live records</span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div className="profile-stat" style={{ background: "rgba(37, 99, 235, 0.05)", borderColor: "rgba(37, 99, 235, 0.1)" }}>
              <strong style={{ color: "#2563eb", fontSize: "1.4rem" }}>{totalTasks}</strong>
              <span style={{ fontSize: "0.78rem" }}>Total Tasks</span>
            </div>
            <div className="profile-stat" style={{ background: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.1)" }}>
              <strong style={{ color: "#10b981", fontSize: "1.4rem" }}>{completedTasks}</strong>
              <span style={{ fontSize: "0.78rem" }}>Complete</span>
            </div>
            <div className="profile-stat" style={{ background: "rgba(245, 158, 11, 0.05)", borderColor: "rgba(245, 158, 11, 0.1)" }}>
              <strong style={{ color: "#f59e0b", fontSize: "1.4rem" }}>{dueTodayTasks}</strong>
              <span style={{ fontSize: "0.78rem" }}>Due Today</span>
            </div>
            <div className="profile-stat" style={{ background: "rgba(239, 68, 68, 0.05)", borderColor: "rgba(239, 68, 68, 0.1)" }}>
              <strong style={{ color: "#ef4444", fontSize: "1.4rem" }}>{overdueInvoices}</strong>
              <span style={{ fontSize: "0.78rem" }}>Overdue Invoices</span>
            </div>
          </div>
        </div>

        {/* Deal ledger */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Deal Ledger</h3>
              <span>Recent live opportunities with account drill-down</span>
            </div>
            <div className="table-toolbar">
              <select className="select select-compact" value={dealFilter} onChange={(event) => setDealFilter(event.target.value as typeof dealFilter)}>
                <option value="all">All deals</option>
                <option value="OPEN">Open</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
              </select>
              <select className="select select-compact" value={dealSort} onChange={(event) => setDealSort(event.target.value as typeof dealSort)}>
                <option value="recent">Most recent</option>
                <option value="value-high">Highest value</option>
                <option value="value-low">Lowest value</option>
                <option value="status">Status</option>
              </select>
              <Link href="/deals" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                View all deals
              </Link>
            </div>
          </div>

          <table className="popular-items-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Account</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Value</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.slice(0, 5).map((deal: any) => (
                <tr key={deal.id}>
                  <td>
                    <strong>{deal.name}</strong>
                    <div className="deal-meta">Updated {new Date(deal.updatedAt).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <Link href={`/accounts/${deal.account.id}`} style={{ color: "var(--text)", fontWeight: 700 }}>
                      {deal.account.name}
                    </Link>
                  </td>
                  <td>
                    <span className="badge" style={{ borderColor: deal.stage.color, color: deal.stage.color }}>
                      {deal.stage.name}
                    </span>
                  </td>
                  <td>{deal.owner.name}</td>
                  <td>{formatVal(deal.value)}</td>
                  <td>
                    <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedDetail({ kind: "deal", item: deal })}>
                      View in details
                    </button>
                  </td>
                </tr>
              ))}
              {sortedDeals.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No deal records found in database.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Executive review queue */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Executive Review Queue</h3>
              <span>Accounts that need attention or a scheduled review</span>
            </div>
            <div className="table-toolbar">
              <select className="select select-compact" value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as typeof reviewFilter)}>
                <option value="all">All accounts</option>
                <option value="healthy">Healthy</option>
                <option value="watch">Watch</option>
                <option value="risk">At risk</option>
              </select>
              <select className="select select-compact" value={reviewSort} onChange={(event) => setReviewSort(event.target.value as typeof reviewSort)}>
                <option value="risk">Highest risk</option>
                <option value="recent">Next review date</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
          <table className="popular-items-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Owner</th>
                <th>Next review</th>
                <th>Health</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.slice(0, 5).map((account: any) => {
                const score = account.healthScore ?? 0;
                const statusLabel = score >= 80 ? "Healthy" : score >= 60 ? "Watch" : "At risk";
                const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

                return (
                  <tr key={account.id}>
                    <td>
                      <Link href={`/accounts/${account.id}`} style={{ color: "var(--text)", fontWeight: 700 }}>
                        {account.name}
                      </Link>
                    </td>
                    <td>{account.owner?.name ?? "Unassigned"}</td>
                    <td>{account.nextReviewAt ? new Date(account.nextReviewAt).toLocaleDateString() : "Due now"}</td>
                    <td>
                      <span className="badge" style={{ borderColor: scoreColor, color: scoreColor }}>
                        {score}%
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ borderColor: scoreColor, color: scoreColor }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedDetail({ kind: "review", item: account })}>
                        View in details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredReviews.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No accounts need review right now.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ paddingTop: "12px" }}>
            <Link href="/accounts?view=review-needed" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
              Open review view
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

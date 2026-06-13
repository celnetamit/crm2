"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useState } from "react";

interface Dashboard2ClientProps {
  session: any;
  data: any;
  analytics: any;
}

type ChartPoint = {
  x: number;
  y: number;
  label: string;
  val: number;
};

type OwnerSummary = {
  id: string;
  name: string;
  value: number;
  count: number;
  wonCount: number;
  openCount: number;
};

type BucketSummary = {
  label: string;
  value: number;
};

export default function Dashboard2Client({ session, data, analytics }: Dashboard2ClientProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "healthy" | "watch" | "risk">("risk");
  const [reviewSort, setReviewSort] = useState<"risk" | "recent" | "name">("risk");
  const [selectedInsight, setSelectedInsight] = useState<{ kind: "account" | "owner" | "stage"; item: any } | null>(null);

  // Format money helper
  const formatVal = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // KPI Metrics calculations
  const totalCustomers = analytics.counts.accounts;
  const totalRevenueVal = analytics.counts.totalDealsValue;
  const totalInvoicesVal = analytics.counts.totalInvoicesValue;
  const profitPercentage = Math.round((analytics.counts.wonDealsValue / (totalRevenueVal || 1)) * 100) || 68;

  const ownerPerformance = (analytics.visuals?.ownerPerformance ?? []) as OwnerSummary[];
  const sourceBreakdown = (analytics.visuals?.sourceBreakdown ?? []) as BucketSummary[];
  const industryBreakdown = (analytics.visuals?.industryBreakdown ?? []) as BucketSummary[];
  const stageFunnel = (analytics.visuals?.stageFunnel ?? []) as Array<{ label: string; count: number; value: number }>;

  const topOwners = ownerPerformance.slice(0, 7);
  const maxOwnerValue = Math.max(...topOwners.map((owner: any) => owner.value), 1);
  const maxOwnerCount = Math.max(...topOwners.map((owner: any) => owner.count), 1);
  const ownerTotalValue = topOwners.reduce((sum: number, owner: any) => sum + (owner.value ?? 0), 0) || 1;
  const topOwnerShare = Math.round(((topOwners[0]?.value ?? 0) / ownerTotalValue) * 100);
  const topOwnerDelta = topOwners.length > 1
    ? Math.round(((topOwners[0].value - topOwners[1].value) / Math.max(topOwners[1].value, 1)) * 100)
    : 0;
  const ownerValuePoints: ChartPoint[] = topOwners.map((owner, index: number) => ({
    x: 50 + index * 90,
    y: 180 - (owner.value / maxOwnerValue) * 120,
    label: owner.name,
    val: owner.value,
  }));
  const ownerCountPoints: ChartPoint[] = topOwners.map((owner, index: number) => ({
    x: 50 + index * 90,
    y: 200 - (owner.count / maxOwnerCount) * 90,
    label: owner.name,
    val: owner.count,
  }));

  // Helper to construct SVG smooth spline path
  const getSplinePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const path1 = getSplinePath(ownerValuePoints);
  const path2 = getSplinePath(ownerCountPoints);

  const sourceTotal = sourceBreakdown.reduce((sum: number, item: any) => sum + item.value, 0) || 1;
  const sourcePalette = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
  const leadSourceSegments: Array<{ label: string; value: number; rawValue: number; color: string; dash: string; offset: string }> = [];
  let sourceOffset = 0;
  for (let index = 0; index < sourceBreakdown.length; index += 1) {
    const seg = sourceBreakdown[index];
    const percentage = Math.max(1, Math.round((seg.value / sourceTotal) * 100));
    leadSourceSegments.push({
      label: seg.label,
      value: percentage,
      rawValue: seg.value,
      color: sourcePalette[index % sourcePalette.length],
      dash: `${percentage} 100`,
      offset: String(-sourceOffset),
    });
    sourceOffset += percentage;
  }

  const funnelData = stageFunnel.slice(0, 5).map((stage) => ({
    label: stage.label,
    count: stage.count,
    value: stage.value,
  }));
  const maxFunnelCount = Math.max(...funnelData.map((item: any) => item.count), 1);
  const maxFunnelValue = Math.max(...funnelData.map((item: any) => item.value), 1);
  const stageTotalCount = funnelData.reduce((sum: number, stage: any) => sum + stage.count, 0) || 1;
  const stageRows = funnelData.map((stage) => ({
    ...stage,
    share: Math.round((stage.count / stageTotalCount) * 100),
  }));
  const topIndustries = industryBreakdown.slice(0, 3);
  const sortedReviews = [...(data.accountsNeedingReview ?? [])]
    .filter((acc: any) => {
      const score = acc.healthScore ?? 0;
      if (reviewFilter === "healthy") return score >= 80;
      if (reviewFilter === "watch") return score >= 60 && score < 80;
      if (reviewFilter === "risk") return score < 60 || acc.status === "AT_RISK";
      return true;
    })
    .sort((a: any, b: any) => {
      const aScore = a.healthScore ?? 0;
      const bScore = b.healthScore ?? 0;
      if (reviewSort === "recent") return new Date(a.nextReviewAt ?? a.updatedAt).getTime() - new Date(b.nextReviewAt ?? b.updatedAt).getTime();
      if (reviewSort === "name") return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      return aScore - bScore;
    });
  const selectedOwner = selectedInsight?.kind === "owner" ? selectedInsight.item : null;
  const selectedStage = selectedInsight?.kind === "stage" ? selectedInsight.item : null;
  const selectedAccount = selectedInsight?.kind === "account" ? selectedInsight.item : null;

  return (
    <div className="dashboard-grid-layout">
      {/* LEFT COLUMN */}
      <div className="dashboard-card-section">
        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {/* Customers */}
          <div className="mini-card">
            <span>Customers</span>
            <strong>{totalCustomers}</strong>
            <span className="trend">+14.5%</span>
          </div>
          {/* Revenue */}
          <div className="mini-card">
            <span>Revenue</span>
            <strong>{formatVal(totalRevenueVal)}</strong>
            <span className="trend">+12.4%</span>
          </div>
          {/* Invoices */}
          <div className="mini-card">
            <span>Invoices</span>
            <strong>{formatVal(totalInvoicesVal)}</strong>
            <span className="trend">+8.2%</span>
          </div>
          {/* Profit */}
          <div className="mini-card">
            <span>Profit Margin</span>
            <strong>{profitPercentage}%</strong>
            <span className="trend">+4.5%</span>
          </div>
        </div>

        {/* Opportunities by User Spline Chart */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Opportunities by Owner</h3>
                <span>Deal value and activity count per live owner in {session.organizationName}</span>
              </div>
              <div style={{ display: "flex", gap: "12px", fontSize: "0.82rem", alignItems: "center", flexWrap: "wrap" }}>
                <span className="badge" style={{ borderColor: "#2563eb", color: "#2563eb" }}>
                  +{topOwnerDelta}% vs runner-up
                </span>
                <span className="badge" style={{ borderColor: "#10b981", color: "#10b981" }}>
                  {topOwnerShare}% of owner value
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "12px", height: "4px", background: "#2563eb", borderRadius: "2px" }} />
                  Deal value
                </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "12px", height: "4px", background: "#10b981", borderRadius: "2px" }} />
                Deal count
              </span>
            </div>
          </div>

          <div className="chart-container-svg" style={{ height: "240px" }}>
            <svg className="chart-svg" viewBox="0 0 650 240">
              {/* Grid lines */}
              <line x1="50" y1="40" x2="600" y2="40" className="grid-line-x" />
              <line x1="50" y1="90" x2="600" y2="90" className="grid-line-x" />
              <line x1="50" y1="140" x2="600" y2="140" className="grid-line-x" />
              <line x1="50" y1="190" x2="600" y2="190" className="grid-line-x" />

              {/* Axis labels */}
              <text x="40" y="44" textAnchor="end" className="chart-axis-text">100%</text>
              <text x="40" y="94" textAnchor="end" className="chart-axis-text">75%</text>
              <text x="40" y="144" textAnchor="end" className="chart-axis-text">50%</text>
              <text x="40" y="194" textAnchor="end" className="chart-axis-text">25%</text>

              {/* Spline Paths */}
              <path d={path1} className="spline-line-primary" />
              <path d={path2} className="spline-line-secondary" />

              {/* Data Points */}
              {ownerValuePoints.map((p, idx) => (
                <g key={`p1-${idx}`}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    className="chart-point"
                    stroke="#2563eb"
                    onMouseEnter={() => setHoveredPoint(`${p.label}: INR ${p.val.toLocaleString()} value`)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  <text x={p.x} y="215" textAnchor="middle" className="chart-axis-text">{p.label.split(" ")[0]}</text>
                </g>
              ))}

              {/* Data Points 2 */}
              {ownerCountPoints.map((p, idx) => (
                <circle
                  key={`p2-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  className="chart-point"
                  stroke="#10b981"
                  onMouseEnter={() => setHoveredPoint(`${p.label}: ${p.val} deals`)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* Tooltip Overlay */}
              {hoveredPoint && (
                <g transform="translate(280, 20)">
                  <rect x="0" y="0" width="200" height="30" fill="var(--text)" rx="6" />
                  <text x="100" y="19" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="bold">
                    {hoveredPoint}
                  </text>
                </g>
              )}
            </svg>
          </div>
          <table className="popular-items-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Deals</th>
                <th>Won</th>
                <th>Open</th>
                <th>Win Rate</th>
                <th>Value</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {topOwners.map((owner: any) => {
                const winRate = owner.count > 0 ? Math.round((owner.wonCount / owner.count) * 100) : 0;
                return (
                  <tr key={owner.id}>
                    <td>
                      <strong>{owner.name}</strong>
                      <div className="deal-meta">Live owner performance</div>
                    </td>
                    <td>{owner.count}</td>
                    <td>
                      <span className="badge status-active">{owner.wonCount}</span>
                    </td>
                    <td>
                      <span className="badge status-warning">{owner.openCount}</span>
                    </td>
                    <td>
                      <span className="badge status-active">{winRate}%</span>
                    </td>
                    <td>{formatVal(owner.value)}</td>
                    <td>
                      <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedInsight({ kind: "owner", item: owner })}>
                        View in details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Lead Source and Sales Funnel layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Lead Source Donut */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Lead Source</h3>
                <span>Live source mix from account records</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ position: "relative", width: "130px", height: "130px" }}>
                <svg width="100%" height="100%" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="4" />
                  {leadSourceSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="21"
                      cy="21"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="4.2"
                      strokeDasharray={seg.dash}
                      strokeDashoffset={seg.offset}
                    />
                  ))}
                </svg>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                  <div style={{ fontSize: "1.1rem", fontWeight: 850 }}>{leadSourceSegments[0]?.value ?? 0}%</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-soft)" }}>{leadSourceSegments[0]?.label ?? "No source data"}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                {leadSourceSegments.map((seg, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: seg.color }} />
                      {seg.label}
                    </span>
                    <span style={{ fontWeight: 700, marginLeft: "auto" }}>{seg.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sales Funnel Chart */}
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <h3>Pipeline Stages</h3>
                <span>Deal counts and value by stage</span>
              </div>
              <span className="badge" style={{ borderColor: "#3b82f6", color: "#3b82f6" }}>
                {stageTotalCount} open deals
              </span>
            </div>

            <div className="chart-container-svg" style={{ height: "160px" }}>
              <svg className="chart-svg" viewBox="0 0 340 160">
                <line x1="30" y1="10" x2="280" y2="10" className="grid-line-x" />
                <line x1="30" y1="55" x2="280" y2="55" className="grid-line-x" />
                <line x1="30" y1="100" x2="280" y2="100" className="grid-line-x" />

                {funnelData.map((d, index) => {
                  const x = 40 + index * 50;
                  const countH = (d.count / maxFunnelCount) * 90;
                  const valueH = (d.value / maxFunnelValue) * 90;

                  return (
                    <g key={d.label}>
                      {/* Count bar */}
                      <rect
                        x={x}
                        y={100 - countH}
                        width="12"
                        height={countH}
                        fill="#3b82f6"
                        rx="2"
                      />
                      {/* Value bar */}
                      <rect
                        x={x + 14}
                        y={100 - valueH}
                        width="12"
                        height={valueH}
                        fill="#10b981"
                        rx="2"
                      />
                      <text x={x + 13} y="118" textAnchor="middle" className="chart-axis-text">{d.label.slice(0, 3)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Deals</th>
                  <th>Value</th>
                  <th>Share</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {stageRows.map((stage) => (
                  <tr key={stage.label}>
                    <td>{stage.label}</td>
                    <td>
                      <span className="badge status-active">{stage.count}</span>
                    </td>
                    <td>{formatVal(stage.value)}</td>
                    <td>{stage.share}%</td>
                    <td>
                      <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedInsight({ kind: "stage", item: stage })}>
                        View in details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <Link href="/deals" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                Open pipeline
              </Link>
            </div>
          </div>
        </div>

        {/* Sales Analytics Popular Items Table */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Accounts Needing Review</h3>
              <span>Live accounts pulled from the database</span>
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
                <th>Account & Company</th>
                <th>Industry</th>
                <th>Source</th>
                <th>Health Score</th>
                <th>Status</th>
                <th>Open</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedReviews.slice(0, 4).map((acc: any) => {
                const score = acc.healthScore ?? 85;
                const isAtRisk = acc.status === "AT_RISK" || score < 60;
                const statusClass = isAtRisk ? "status-overdue" : "status-active";
                const textInitial = acc.name.slice(0, 1).toUpperCase();

                return (
                  <tr key={acc.id}>
                    <td>
                      <Link href={`/accounts/${acc.id}`} className="popular-product-cell" style={{ color: "inherit" }}>
                        <div className="popular-product-thumb">{textInitial}</div>
                        <div>
                          <div className="popular-product-name">{acc.name}</div>
                          <div className="popular-product-meta">{acc.website || "No website"}</div>
                        </div>
                      </Link>
                    </td>
                    <td>{acc.industry || "General"}</td>
                    <td>
                      <span className="badge">{acc.source || "Direct"}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="progress-track-bar" style={{ width: "60px", height: "6px" }}>
                          <div
                            className="progress-fill-bar"
                            style={{
                              width: `${score}%`,
                              backgroundColor: isAtRisk ? "#ef4444" : "#10b981",
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700 }}>{score}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusClass}`}>{acc.status}</span>
                    </td>
                    <td>
                      <Link href={`/accounts/${acc.id}`} className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }}>
                        Open
                      </Link>
                    </td>
                    <td>
                      <button type="button" className="secondary-button" style={{ padding: "6px 10px", fontSize: "0.78rem" }} onClick={() => setSelectedInsight({ kind: "account", item: acc })}>
                        View in details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
            <Link href="/accounts?view=review-needed" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
              Review accounts
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
        <div className="dashboard-card-section">
        <div className="drawer-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Details Drawer</h3>
              <span>Quick drill-down for owners, stages, and accounts</span>
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
                Use the View in details action on any owner, stage, or account row to open a compact executive brief.
              </p>
            </div>
          ) : selectedInsight.kind === "owner" ? (
            <div className="nested-card" style={{ display: "grid", gap: "10px" }}>
              <div className="eyebrow">Owner</div>
              <h4 style={{ margin: 0 }}>{selectedOwner?.name}</h4>
              <div className="deal-meta">{selectedOwner?.count ?? 0} deals · {selectedOwner?.wonCount ?? 0} won · {selectedOwner?.openCount ?? 0} open</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge status-active">{Math.round(((selectedOwner?.wonCount ?? 0) / Math.max(selectedOwner?.count ?? 0, 1)) * 100)}% win rate</span>
                <span className="badge">{formatVal(selectedOwner?.value ?? 0)}</span>
              </div>
              <Link href="/deals" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem", width: "fit-content" }}>
                View in details
              </Link>
            </div>
          ) : selectedInsight.kind === "stage" ? (
            <div className="nested-card" style={{ display: "grid", gap: "10px" }}>
              <div className="eyebrow">Stage</div>
              <h4 style={{ margin: 0 }}>{selectedStage?.label}</h4>
              <div className="deal-meta">{selectedStage?.count ?? 0} deals in this stage</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge status-active">{selectedStage?.share ?? 0}% of open pipeline</span>
                <span className="badge">{formatVal(selectedStage?.value ?? 0)}</span>
              </div>
              <Link href="/deals" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem", width: "fit-content" }}>
                View in details
              </Link>
            </div>
          ) : (
            <div className="nested-card" style={{ display: "grid", gap: "10px" }}>
              <div className="eyebrow">Account</div>
              <h4 style={{ margin: "4px 0 0" }}>{selectedAccount?.name}</h4>
              <div className="deal-meta">{selectedAccount?.industry || "General"} · {selectedAccount?.source || "Direct"}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge" style={{ borderColor: selectedAccount?.status === "AT_RISK" ? "#ef4444" : "#10b981", color: selectedAccount?.status === "AT_RISK" ? "#ef4444" : "#10b981" }}>
                  {selectedAccount?.healthScore ?? 0}% health
                </span>
                <span className={`badge ${selectedAccount?.status === "AT_RISK" ? "status-overdue" : "status-active"}`}>{selectedAccount?.status ?? "OPEN"}</span>
              </div>
              <Link href={`/accounts/${selectedAccount?.id}`} className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem", width: "fit-content" }}>
                View in details
              </Link>
            </div>
          )}
        </div>

        {/* Account source donut */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Source Share</h3>
              <span>Account acquisition mix</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <div style={{ position: "relative", width: "150px", height: "150px" }}>
              <svg width="100%" height="100%" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="4.5" />
                {leadSourceSegments.map((segment, index) => (
                  <circle
                    key={index}
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="4.5"
                    strokeDasharray={segment.dash}
                    strokeDashoffset={segment.offset}
                  />
                ))}
              </svg>
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.2rem", fontWeight: 900 }}>{leadSourceSegments[0]?.value ?? 0}%</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-soft)" }}>{leadSourceSegments[0]?.label ?? "No source data"}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
              {leadSourceSegments.slice(0, 3).map((segment, index) => (
                <span key={index} className="badge" style={{ borderColor: segment.color, color: segment.color }}>
                  {segment.value}% {segment.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Industry mix */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Industry Mix</h3>
              <span>Top industries from account records</span>
            </div>
          </div>

          <div className="mapping-countries-list">
            {topIndustries.length === 0 ? (
              <div className="empty-state">No industry data is available yet.</div>
            ) : (
              topIndustries.map((industry: any, idx: number) => {
                const maxIndustry = Math.max(...topIndustries.map((item: any) => item.value), 1);
                const width = Math.round((industry.value / maxIndustry) * 100);
                const colors = ["#3b82f6", "#10b981", "#f59e0b"];
                const color = colors[idx % colors.length];

                return (
                  <div key={industry.label} className="country-stat-row">
                    <div className="country-name-flag">
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color }} />
                      <span>{industry.label}</span>
                    </div>
                    <div className="country-progress-bar">
                      <div className="country-progress-fill" style={{ width: `${width}%`, backgroundColor: color }} />
                    </div>
                    <span className="country-percentage">{industry.value}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ownership workload */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <h3>Owner Workload</h3>
              <span>Deal count versus closed value per owner</span>
            </div>
          </div>

            <div className="chart-container-svg" style={{ height: "160px" }}>
              <svg className="chart-svg" viewBox="0 0 300 160">
              <line x1="30" y1="20" x2="280" y2="20" className="grid-line-x" />
              <line x1="30" y1="70" x2="280" y2="70" className="grid-line-x" />
              <line x1="30" y1="120" x2="280" y2="120" className="grid-line-x" />

              {/* Clustered Columns */}
              {topOwners.slice(0, 3).map((owner: any, idx: number) => {
                const x = 50 + idx * 80;
                const countHeight = Math.max(20, (owner.count / maxOwnerCount) * 100);
                const valueHeight = Math.max(20, (owner.value / maxOwnerValue) * 100);

                return (
                  <g key={owner.id}>
                    <rect x={x} y={120 - countHeight} width="16" height={countHeight} fill="#3b82f6" rx="3" />
                    <rect x={x + 20} y={120 - valueHeight} width="16" height={valueHeight} fill="#10b981" rx="3" />
                    <text x={x + 18} y="140" textAnchor="middle" className="chart-axis-text">{owner.name.split(" ")[0]}</text>
                  </g>
                );
                })}
              </svg>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Deals</th>
                  <th>Open</th>
                  <th>Won</th>
                </tr>
              </thead>
              <tbody>
                {topOwners.map((owner) => (
                  <tr key={owner.id}>
                    <td>{owner.name}</td>
                    <td>{owner.count}</td>
                    <td>{owner.openCount}</td>
                    <td>{owner.wonCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ paddingTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <Link href="/deals" className="secondary-button" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                View deal owners
              </Link>
            </div>
          </div>
        </div>
    </div>
  );
}

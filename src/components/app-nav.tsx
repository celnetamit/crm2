"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const mainNavItems = [
  { href: "/accounts", label: "Accounts", icon: "users" },
  { href: "/deals", label: "Deals", icon: "target" },
  { href: "/tasks", label: "Follow-ups", icon: "clock" },
  { href: "/billing", label: "Billing", icon: "receipt" },
  { href: "/automation", label: "Automation", icon: "spark" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

function Icon({ name }: { name: string }) {
  switch (name) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <path d="M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M20 21v-2a3 3 0 0 0-2-2.83" />
          <path d="M16.5 4.21a3.5 3.5 0 0 1 0 6.58" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "receipt":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M4 3h16v18l-2-1.25L16 21l-2-1.25L12 21l-2-1.25L8 21l-2-1.25L4 21z" />
          <path d="M8 7h8M8 11h8M8 15h6" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8Z" />
        </svg>
      );
    case "support":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="M12 16v.01M12 8a2 2 0 0 1 2 2c0 1.333-2 2-2 2" />
        </svg>
      );
    case "features":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case "forms":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "tables":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M3 3h18v18H3zM3 9h18M3 15h18M12 3v18" />
        </svg>
      );
    case "apps":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      );
    case "auth":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "misc":
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case "settings":
    default:
      return (
        <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
          <path d="M12 8.5A3.5 3.5 0 1 0 12 15a3.5 3.5 0 0 0 0-6.5Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 4.29 17l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 6.1 4.29l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 1 1.5 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 19.71 6.1l-.06.06A1.65 1.65 0 0 0 19.4 8c.48.2.87.58 1 1.05h.6a2 2 0 0 1 0 4h-.1c-.47.13-.85.52-1.05 1Z" />
        </svg>
      );
  }
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const [dashboardOpen, setDashboardOpen] = useState(true);

  const isDashboardActive = pathname === "/" || pathname === "/dashboard-2" || pathname === "/dashboard-3";

  return (
    <nav className="nav-stack-container" aria-label="Primary">
      <div className="nav-section-label">EXECUTIVE DASHBOARDS</div>
      
      {/* Collapsible Dashboard Node */}
      <div className={`collapsible-nav-group${dashboardOpen ? " is-open" : ""}`}>
        <button
          type="button"
          onClick={() => setDashboardOpen(!dashboardOpen)}
          className={`nav-item nav-parent${isDashboardActive ? " active-parent" : ""}`}
        >
          <div className="nav-parent-left">
            <Icon name="grid" />
            <span>Revenue Command Center</span>
          </div>
          <svg
            className={`chevron-icon${dashboardOpen ? " rotate-180" : ""}`}
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {dashboardOpen && (
          <div className="nav-sub-list">
            <Link
              href="/"
              className={`nav-sub-item${pathname === "/" ? " active" : ""}`}
            >
              <span className="sub-bullet">+</span>
              <span>Revenue Command Center</span>
            </Link>
            <Link
              href="/dashboard-2"
              className={`nav-sub-item${pathname === "/dashboard-2" ? " active" : ""}`}
            >
              <span className="sub-bullet">+</span>
              <span>Pipeline Intelligence</span>
            </Link>
            <Link
              href="/dashboard-3"
              className={`nav-sub-item${pathname === "/dashboard-3" ? " active" : ""}`}
            >
              <span className="sub-bullet">+</span>
              <span>Customer Health &amp; Operations</span>
            </Link>
          </div>
        )}
      </div>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="nav-item mock-nav"
      >
        <Icon name="support" />
        <span>Support</span>
        <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-right-icon">
          <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <div className="nav-section-label">COMPONENTS</div>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="nav-item mock-nav"
      >
        <Icon name="features" />
        <span>Features</span>
        <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-right-icon">
          <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="nav-item mock-nav"
      >
        <Icon name="forms" />
        <span>Forms & Charts</span>
        <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-right-icon">
          <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="nav-item mock-nav"
      >
        <Icon name="tables" />
        <span>Tables</span>
        <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-right-icon">
          <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="nav-item mock-nav"
      >
        <Icon name="apps" />
        <span>Apps & Widgets</span>
        <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-right-icon">
          <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <div className="nav-section-label">LOGIN & ERROR</div>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="nav-item mock-nav"
      >
        <Icon name="auth" />
        <span>Authentication</span>
        <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-right-icon">
          <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <Link
        href="#"
        onClick={(e) => e.preventDefault()}
        className="nav-item mock-nav"
      >
        <Icon name="misc" />
        <span>Miscellaneous</span>
        <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-right-icon">
          <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <div className="nav-section-label">CRM OPERATIONS</div>

      {mainNavItems.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* CRM branding card */}
      <div className="sidebar-crm-card">
        <div className="crm-card-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="crm-card-title">CRM Hq Admin</div>
        <div className="crm-card-desc">Powering clean relations and pipeline movement.</div>
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Crumb = {
  label: string;
  href?: string;
};

function getCrumbs(pathname: string): Crumb[] {
  if (pathname === "/" || pathname === "/dashboard") {
    return [{ label: "Dashboard" }];
  }

  if (pathname.startsWith("/accounts/")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Customers", href: "/accounts" },
      { label: "Customer profile" },
    ];
  }

  if (pathname.startsWith("/accounts")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Customers" },
    ];
  }

  if (pathname.startsWith("/deals")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Deals", href: "/deals" },
      { label: "Deals" },
    ];
  }

  if (pathname.startsWith("/tasks")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Follow-ups" },
    ];
  }

  if (pathname.startsWith("/billing")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Billing" },
    ];
  }

  if (pathname.startsWith("/settings")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Team" },
    ];
  }

  if (pathname.startsWith("/automation")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Automation" },
    ];
  }

  if (pathname.startsWith("/search")) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Search" },
    ];
  }

  return [{ label: "Dashboard", href: "/dashboard" }];
}

export function WorkspaceBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = getCrumbs(pathname);

  return (
    <nav className="workspace-breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span key={`${crumb.label}-${index}`} className="workspace-breadcrumb-item">
            {crumb.href && !isLast ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
            {!isLast ? <span className="workspace-breadcrumb-separator">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}

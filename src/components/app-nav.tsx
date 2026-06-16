"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher } from "@/components/org-switcher";

type OrganizationItem = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  role: string;
};

type AppNavProps = {
  organizations: OrganizationItem[];
  currentOrganizationId: string;
  onSubmitAction: (formData: FormData) => void | Promise<void>;
  onLogoutAction: (formData: FormData) => void | Promise<void>;
};

type MenuItem = {
  label: string;
  href: string;
};

type MenuGroup = {
  label: string;
  href: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Customers",
    href: "/customers",
    items: [
      { label: "View Customers", href: "/customers" },
      { label: "People", href: "/customers/people" },
      { label: "Add Customer", href: "/customers/manage" },
      { label: "Import Customers", href: "/customers/manage#import" },
    ],
  },
  {
    label: "Deals",
    href: "/deals",
    items: [
      { label: "View Deals", href: "/deals" },
      { label: "Pipeline", href: "/deals/pipeline" },
      { label: "Add Deal", href: "/deals/manage" },
    ],
  },
  {
    label: "Follow-ups",
    href: "/follow-ups",
    items: [
      { label: "View Follow-ups", href: "/follow-ups" },
      { label: "Create Follow-up", href: "/follow-ups" },
    ],
  },
  {
    label: "Billing",
    href: "/billing",
    items: [
      { label: "View Billing", href: "/billing" },
      { label: "Customers", href: "/billing/customers" },
      { label: "Add Invoice", href: "/billing/manage" },
    ],
  },
  {
    label: "Team",
    href: "/settings",
    items: [
      { label: "Team members", href: "/settings" },
      { label: "Directory", href: "/settings/directory" },
      { label: "Invites", href: "/settings/invites" },
      { label: "Settings", href: "/settings/manage" },
    ],
  },
];

function iconPath(name: "home" | "plus" | "bell" | "user" | "chev" | "menu" | "close") {
  switch (name) {
    case "home":
      return <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />;
    case "plus":
      return <path d="M12 5v14M5 12h14" />;
    case "bell":
      return (
        <>
          <path d="M15 17H9" />
          <path d="M18 16H6l1.5-2.2V10a4.5 4.5 0 0 1 9 0v3.8z" />
          <path d="M10.5 17a1.5 1.5 0 0 0 3 0" />
        </>
      );
    case "user":
      return (
        <>
          <circle cx="12" cy="8.5" r="3.2" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </>
      );
    case "chev":
      return <path d="m8 10 4 4 4-4" />;
    case "menu":
      return <path d="M4 7h16M4 12h16M4 17h16" />;
    case "close":
      return <path d="m6 6 12 12M18 6 6 18" />;
  }
}

function MenuChevron() {
  return (
    <svg viewBox="0 0 24 24" className="topnav-chevron" aria-hidden="true">
      {iconPath("chev")}
    </svg>
  );
}

function IconButton({ name }: { name: "home" | "plus" | "bell" | "user" | "menu" | "close" }) {
  return (
    <svg viewBox="0 0 24 24" className="topnav-icon" aria-hidden="true">
      {iconPath(name)}
    </svg>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/customers") return pathname === "/customers" || pathname.startsWith("/accounts");
  if (href === "/deals") return pathname === "/deals";
  if (href === "/follow-ups") return pathname === "/follow-ups" || pathname.startsWith("/tasks");
  if (href === "/billing") return pathname === "/billing";
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ organizations, currentOrganizationId, onSubmitAction, onLogoutAction }: AppNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <div className="topnav-shell">
      <button
        type="button"
        className="topnav-burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="topnav-collapse"
        onClick={() => setOpen((value) => !value)}
      >
        <IconButton name={open ? "close" : "menu"} />
      </button>

      <div id="topnav-collapse" className={`topnav-collapse${open ? " is-open" : ""}`}>
        <div className="topnav-left">
          <Link href="/dashboard" className="topnav-home" aria-label="Dashboard" onClick={closeMenu}>
            <IconButton name="home" />
          </Link>

          <div className="topnav-menu-row">
            {menuGroups.map((group) => {
              const active = isActivePath(pathname, group.href);
              return (
                <details key={group.href} className={`topnav-menu${active ? " is-active" : ""}`}>
                  <summary className="topnav-menu-summary">
                    <span>{group.label}</span>
                    <MenuChevron />
                  </summary>
                  <div className="topnav-dropdown">
                    {group.items.map((item) => (
                      <Link
                        key={`${group.href}:${item.href}:${item.label}`}
                        href={item.href}
                        className="topnav-dropdown-item"
                        onClick={closeMenu}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div className="topnav-right">
          <OrganizationSwitcher
            organizations={organizations}
            currentOrganizationId={currentOrganizationId}
            onSubmitAction={onSubmitAction}
          />

          <form action="/search" method="get" className="topnav-search">
            <label className="sr-only" htmlFor="workspace-search">
              Search workspace
            </label>
            <input id="workspace-search" name="q" className="topnav-search-input" placeholder="Search..." />
          </form>

          <details className="topnav-action-menu">
            <summary className="topnav-action-button" aria-label="Create new">
              <IconButton name="plus" />
            </summary>
            <div className="topnav-dropdown topnav-dropdown-right">
              <Link href="/customers/manage" className="topnav-dropdown-item" onClick={closeMenu}>
                Create customer
              </Link>
              <Link href="/deals/manage" className="topnav-dropdown-item" onClick={closeMenu}>
                Create deal
              </Link>
              <Link href="/follow-ups" className="topnav-dropdown-item" onClick={closeMenu}>
                Create follow-up
              </Link>
              <Link href="/billing/manage" className="topnav-dropdown-item" onClick={closeMenu}>
                Create invoice
              </Link>
              <Link href="/settings/invites" className="topnav-dropdown-item" onClick={closeMenu}>
                Invite user
              </Link>
            </div>
          </details>

          <button type="button" className="topnav-icon-button" aria-label="Notifications">
            <IconButton name="bell" />
          </button>

          <Link href="/settings" className="topnav-profile" aria-label="Open team and settings" onClick={closeMenu}>
            <IconButton name="user" />
          </Link>

          <form action={onLogoutAction} className="topnav-signout">
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

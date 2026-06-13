import Link from "next/link";
import { logoutAction, switchOrganizationAction } from "@/app/actions";
import { getShellData } from "@/lib/crm";
import { OrganizationSwitcher } from "@/components/org-switcher";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, organizations } = await getShellData();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">C2</div>
          <div>
            <div className="brand-name">CRM2</div>
            <div className="brand-subtitle">{session.organizationName}</div>
          </div>
        </div>

        <OrganizationSwitcher
          organizations={organizations}
          currentOrganizationId={session.organizationId}
          onSubmitAction={switchOrganizationAction}
        />

        <AppNav />

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{session.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="user-name">{session.name}</div>
              <div className="user-role">{session.role}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-copy">
            <div className="eyebrow">Multi-tenant CRM workspace</div>
            <h1>{session.organizationName}</h1>
            <p>Mint-toned workspace for accounts, deals, billing, and follow-through.</p>
          </div>
          <form className="topbar-search" action="/accounts" method="get">
            <label className="sr-only" htmlFor="workspace-search">
              Search accounts
            </label>
            <input
              id="workspace-search"
              name="q"
              className="search-input"
              placeholder="Search accounts, contacts, notes..."
            />
            <button type="submit" className="secondary-button">
              Search
            </button>
          </form>
          <div className="topbar-actions">
            <Link href="/accounts" className="primary-button">
              New account
            </Link>
            <Link href="/deals" className="secondary-button">
              New deal
            </Link>
            <Link href="/billing" className="secondary-button">
              New invoice
            </Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

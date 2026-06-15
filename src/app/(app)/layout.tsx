import { logoutAction, switchOrganizationAction } from "@/app/actions";
import { getShellData } from "@/lib/crm";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, organizations } = await getShellData();

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-brand">
          <div className="brand-mark">C2</div>
          <div className="app-topbar-brand-copy">
            <div className="brand-name">CRM2</div>
            <div className="brand-subtitle">{session.organizationName}</div>
          </div>
        </div>

        <AppNav
          organizations={organizations}
          currentOrganizationId={session.organizationId}
          onSubmitAction={switchOrganizationAction}
        />

        <form action={logoutAction} className="app-topbar-signout">
          <button className="secondary-button" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <main className="workspace">
        {children}
      </main>
    </div>
  );
}

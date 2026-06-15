import Link from "next/link";
import { PageHelpPanel } from "@/components/page-help-panel";
import { formatMoney, getWorkspaceSearchData } from "@/lib/crm";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = firstValue(resolvedSearchParams.q) ?? "";
  const results = await getWorkspaceSearchData(query);
  const totalResults =
    results.accounts.length +
    results.contacts.length +
    results.deals.length +
    results.invoices.length +
    results.tasks.length +
    results.users.length;

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Search</div>
            <h2>Search the whole workspace.</h2>
            <p>
              Find customers, people, deals, invoices, follow-ups, and team members from one place instead of hunting
              through separate modules.
            </p>
          </div>

          <div className="hero-actions">
            <div className="chip">{query ? `Query: ${query}` : "Enter a search term"}</div>
            <div className="chip">{totalResults} matches</div>
            <div className="chip">Customers, sales, billing, team</div>
          </div>
        </div>

        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">S</div>
              <div className="profile-copy">
                <h3>Workspace search</h3>
                <span>One search bar across the app</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Search scope</div>
              <div className="profile-track">
                <span style={{ width: "88%" }} />
              </div>
              <div className="deal-meta">Searches active records in the current organization.</div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{results.accounts.length}</strong>
                <span>Customers</span>
              </div>
              <div className="profile-stat">
                <strong>{results.contacts.length}</strong>
                <span>People</span>
              </div>
              <div className="profile-stat">
                <strong>{results.deals.length}</strong>
                <span>Deals</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <PageHelpPanel
        pageTitle="Search"
        whatIsThis="This page is the workspace-wide search hub."
        whatCanIDoHere="Search across customers, people, deals, invoices, follow-ups, and team members in one place."
        commonActions={["Search by name", "Open the matching record", "Jump to the source module", "Refine and search again"]}
        relatedPages={[
          { label: "Customers", href: "/customers" },
          { label: "Deals", href: "/sales" },
          { label: "Follow-ups", href: "/follow-ups" },
        ]}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Search</div>
            <h2>Find records</h2>
          </div>
        </div>

        <form className="topbar-search search-page-form" action="/search" method="get">
          <label className="sr-only" htmlFor="search-page-query">
            Search workspace
          </label>
          <input
            id="search-page-query"
            name="q"
            className="search-input"
            defaultValue={results.query}
            placeholder="Search customers, people, deals, invoices..."
          />
          <button type="submit" className="secondary-button">
            Search
          </button>
        </form>

        {!query ? (
          <div className="stack" style={{ marginTop: 16 }}>
            <div className="deal-meta">Try a customer name, person name, deal title, invoice number, or teammate email.</div>
            <div className="chip-row">
              <Link href="/customers" className="secondary-button">
                Customers
              </Link>
              <Link href="/deals" className="secondary-button">
                Deals
              </Link>
              <Link href="/follow-ups" className="secondary-button">
                Follow-ups
              </Link>
              <Link href="/billing" className="secondary-button">
                Billing
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      {query ? (
        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Results</div>
                <h2>Customers</h2>
              </div>
              <div className="chip">{results.accounts.length}</div>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Industry</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{account.name}</strong>
                        <div className="deal-meta">{account.status}</div>
                      </div>
                    </td>
                    <td>
                      <div className="deal-meta">{account.industry ?? "Unspecified industry"}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/customers/${account.id}`} className="secondary-button table-action-button">
                          Open
                        </Link>
                        <Link href={`/follow-ups?accountId=${account.id}`} className="secondary-button table-action-button">
                          Follow-ups
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {results.accounts.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">No customers match this search.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Results</div>
                <h2>People</h2>
              </div>
              <div className="chip">{results.contacts.length}</div>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Customer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{contact.name}</strong>
                        <div className="deal-meta">{contact.title ?? "No title"}</div>
                      </div>
                    </td>
                    <td>
                        <Link href={`/customers/${contact.account.id}`} className="table-link">
                        {contact.account.name}
                      </Link>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/customers/${contact.account.id}#person-${contact.id}`} className="secondary-button table-action-button">
                          Open
                        </Link>
                        <Link href={`/follow-ups?contactId=${contact.id}`} className="secondary-button table-action-button">
                          Follow-ups
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {results.contacts.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">No people match this search.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Results</div>
                <h2>Deals</h2>
              </div>
              <div className="chip">{results.deals.length}</div>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Customer</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{deal.name}</strong>
                        <div className="deal-meta">{deal.status}</div>
                      </div>
                    </td>
                    <td>
                      <Link href={`/customers/${deal.account.id}`} className="table-link">
                        {deal.account.name}
                      </Link>
                    </td>
                    <td>
                      <div className="deal-meta">{deal.stage.name}</div>
                    </td>
                    <td>
                      <strong>{formatMoney(deal.value)}</strong>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/deals/pipeline#deal-${deal.id}`} className="secondary-button table-action-button">
                          Open
                        </Link>
                        <Link href={`/follow-ups?dealId=${deal.id}`} className="secondary-button table-action-button">
                          Follow-ups
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {results.deals.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">No deals match this search.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Results</div>
                <h2>Billing</h2>
              </div>
              <div className="chip">{results.invoices.length}</div>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{invoice.invoiceNumber}</strong>
                        <div className="deal-meta">{invoice.kind}</div>
                      </div>
                    </td>
                    <td>
                      <Link href={`/customers/${invoice.account.id}`} className="table-link">
                        {invoice.account.name}
                      </Link>
                    </td>
                    <td>
                      <div className="deal-meta">{invoice.status}</div>
                    </td>
                    <td>
                      <strong>{formatMoney(invoice.total)}</strong>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/billing/manage#invoice-${invoice.id}`} className="secondary-button table-action-button">
                          Open
                        </Link>
                        <Link href={`/follow-ups?${invoice.dealId ? `dealId=${invoice.dealId}` : `accountId=${invoice.accountId}`}`} className="secondary-button table-action-button">
                          Follow-ups
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {results.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">No invoices match this search.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Results</div>
                <h2>Follow-ups</h2>
              </div>
              <div className="chip">{results.tasks.length}</div>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Customer</th>
                  <th>Deal</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{task.title}</strong>
                        <div className="deal-meta">{new Date(task.dueAt).toLocaleString()}</div>
                      </div>
                    </td>
                    <td>
                      {task.account ? (
                        <Link href={`/customers/${task.account.id}`} className="table-link">
                          {task.account.name}
                        </Link>
                      ) : (
                        <div className="deal-meta">No customer</div>
                      )}
                    </td>
                    <td>
                      <div className="deal-meta">{task.deal?.name ?? "No deal"}</div>
                    </td>
                    <td>
                      <div className="deal-meta">{task.status}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={task.accountId ? `/follow-ups?accountId=${task.accountId}` : "/follow-ups"} className="secondary-button table-action-button">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {results.tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">No follow-ups match this search.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Results</div>
                <h2>Team</h2>
              </div>
              <div className="chip">{results.users.length}</div>
            </div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.users.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{member.user.name}</strong>
                        <div className="deal-meta">Workspace member</div>
                      </div>
                    </td>
                    <td>
                      <div className="deal-meta">{member.user.email}</div>
                    </td>
                    <td>
                      <div className="deal-meta">{member.role}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href="/team" className="secondary-button table-action-button">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {results.users.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">No team members match this search.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  updateInvoiceAction,
  updateInvoiceStatusAction,
} from "@/app/actions";
import { HelpTip } from "@/components/help-tip";
import { formatMoney, getBillingData, getShellData } from "@/lib/crm";

type BillingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type BillingWorkspaceTab = "billing" | "customers" | "manage";

function normalizeTab(value: string | undefined): BillingWorkspaceTab {
  if (value === "customers" || value === "manage") return value;
  return "billing";
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = normalizeTab(firstValue(resolvedSearchParams.tab));
  const [{ session }, [invoices, accounts, deals]] = await Promise.all([getShellData(), getBillingData()]);
  const canManage = session.role !== "MEMBER";
  const totalOutstanding = invoices.reduce((sum, invoice) => {
    if (invoice.status === "PAID") return sum;
    return sum + invoice.total;
  }, 0);
  const overdueCount = invoices.filter((invoice) => invoice.status === "OVERDUE").length;

  const customerRows = accounts.map((account) => {
    const accountInvoices = invoices.filter((invoice) => invoice.accountId === account.id);
    const outstanding = accountInvoices.reduce((sum, invoice) => (invoice.status === "PAID" ? sum : sum + invoice.total), 0);
    const paidCount = accountInvoices.filter((invoice) => invoice.status === "PAID").length;
    return {
      account,
      invoiceCount: accountInvoices.length,
      outstanding,
      paidCount,
      latestInvoice: accountInvoices[0] ?? null,
    };
  });

  function buildTabHref(tab: BillingWorkspaceTab) {
    if (tab === "customers") return "/billing/customers";
    if (tab === "manage") return "/billing/manage";
    return "/billing";
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Billing</div>
            <h2>Billing index</h2>
            <div className="deal-meta">
              Keep invoices in the table, use Customers for summaries, and Manage for edits and creation.
            </div>
          </div>
          <div className="chip-row">
            <span className="chip">{invoices.length} documents</span>
            <span className="chip">{overdueCount} overdue</span>
            <span className="chip">{formatMoney(totalOutstanding)} outstanding</span>
            <span className="chip">{accounts.length} customers</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header workspace-header">
          <div>
            <div className="eyebrow">Views</div>
            <h2>Billing tabs</h2>
          </div>
          <div className="workspace-tabs" role="tablist" aria-label="Billing workspace tabs">
            <Link
              href={buildTabHref("billing")}
              className={`workspace-tab${activeTab === "billing" ? " is-active" : ""}`}
              aria-current={activeTab === "billing" ? "page" : undefined}
            >
              <span>Billing</span>
              <span className="workspace-tab-count">{invoices.length}</span>
            </Link>
            <Link
              href={buildTabHref("customers")}
              className={`workspace-tab${activeTab === "customers" ? " is-active" : ""}`}
              aria-current={activeTab === "customers" ? "page" : undefined}
            >
              <span>Customers</span>
              <span className="workspace-tab-count">{customerRows.length}</span>
            </Link>
            {canManage ? (
              <Link
                href={buildTabHref("manage")}
                className={`workspace-tab${activeTab === "manage" ? " is-active" : ""}`}
                aria-current={activeTab === "manage" ? "page" : undefined}
              >
                <span>Manage</span>
                <span className="workspace-tab-count">Tools</span>
              </Link>
            ) : null}
          </div>
        </div>

        {activeTab === "billing" ? (
          <div className="stack">
            <div className="deal-meta">Invoice table first. Detail and edit buttons jump to the manage tab for the full form.</div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Customer</th>
                  <th>Deal</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
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
                      <div className="deal-meta">{invoice.deal?.name ?? "No linked deal"}</div>
                    </td>
                    <td>
                      <span
                        className={`badge status-${invoice.status.toLowerCase()}`}
                        title="Invoice payment state."
                      >
                        {invoice.status}
                      </span>
                      <div className="deal-meta">{invoice.recipientEmail ?? "No recipient"}</div>
                    </td>
                    <td>
                      <div className="deal-meta">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "No due date"}</div>
                    </td>
                    <td>
                      <strong>{formatMoney(invoice.total)}</strong>
                      <div className="deal-meta">{invoice.currency}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/billing/manage#invoice-${invoice.id}`} className="secondary-button table-action-button">
                          Detail
                        </Link>
                        <Link href={`/billing/manage#edit-invoice-${invoice.id}`} className="secondary-button table-action-button">
                          Edit
                        </Link>
                        <Link
                          href={`/follow-ups?${invoice.dealId ? `dealId=${invoice.dealId}` : `accountId=${invoice.accountId}`}`}
                          className="secondary-button table-action-button"
                        >
                          Follow-ups
                        </Link>
                        <details className="table-more">
                          <summary className="secondary-button table-action-button">More</summary>
                          <div className="table-more-menu">
                            <Link href={`/customers/${invoice.account.id}`}>Customer</Link>
                            {invoice.deal ? <Link href={`/deals/pipeline#deal-${invoice.deal.id}`}>Deal</Link> : null}
                            {invoice.recipientEmail ? <a href={`mailto:${invoice.recipientEmail}`}>Email recipient</a> : null}
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No invoices or proformas yet.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "customers" ? (
          <div className="stack">
            <div className="deal-meta">Customer billing summary with totals, counts, and quick links back to the account or follow-ups.</div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Documents</th>
                  <th>Outstanding</th>
                  <th>Paid</th>
                  <th>Latest</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customerRows.map((row) => (
                  <tr key={row.account.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{row.account.name}</strong>
                        <div className="deal-meta">{row.account.industry ?? "Unspecified industry"}</div>
                      </div>
                    </td>
                    <td>
                      <strong>{row.invoiceCount}</strong>
                      <div className="deal-meta">{row.account.status}</div>
                    </td>
                    <td>
                      <strong>{formatMoney(row.outstanding)}</strong>
                      <div className="deal-meta">{row.invoiceCount === 0 ? "No billing documents" : "Open balance"}</div>
                    </td>
                    <td>
                      <strong>{row.paidCount}</strong>
                      <div className="deal-meta">Paid documents</div>
                    </td>
                    <td>
                      <div className="deal-meta">{row.latestInvoice ? row.latestInvoice.invoiceNumber : "No documents"}</div>
                      <div className="deal-meta">
                        {row.latestInvoice?.dueDate ? new Date(row.latestInvoice.dueDate).toLocaleDateString() : "No due date"}
                      </div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/customers/${row.account.id}`} className="secondary-button table-action-button">
                          Detail
                        </Link>
                        <Link href={`/customers/${row.account.id}#edit-customer`} className="secondary-button table-action-button">
                          Edit
                        </Link>
                        <Link href={`/follow-ups?accountId=${row.account.id}`} className="secondary-button table-action-button">
                          Follow-ups
                        </Link>
                        <details className="table-more">
                          <summary className="secondary-button table-action-button">More</summary>
                          <div className="table-more-menu">
                            <Link href="/billing">Invoices</Link>
                            <Link href={`/customers/${row.account.id}#people`}>People</Link>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
                {customerRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">No customer billing records yet.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "manage" && canManage ? (
          <div className="stack">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Billing</div>
                  <h2>Invoices and proformas</h2>
                </div>
              </div>

              <div className="stack">
                {invoices.map((invoice) => (
                  <article key={invoice.id} className="row-card" id={`invoice-${invoice.id}`}>
                    <div className="row-card-top">
                      <div>
                        <strong>
                          {invoice.invoiceNumber} · {invoice.account.name}
                        </strong>
                        <div className="deal-meta">
                          {invoice.kind} · {invoice.status}
                        </div>
                      </div>
                      <div className="row-card-value">{formatMoney(invoice.total)}</div>
                    </div>
                    <div className="deal-meta">
                      Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "No due date"} ·{" "}
                      {invoice.recipientEmail ?? "No recipient"}
                    </div>
                    <div className="deal-meta">{invoice.notes ?? "No notes"}</div>
                    <details className="edit-block" id={`edit-invoice-${invoice.id}`}>
                      <summary>Edit document</summary>
                      <form action={updateInvoiceAction} className="stack compact-form">
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <label className="field">
                          <span>Customer</span>
                          <select name="accountId" className="select" required defaultValue={invoice.accountId}>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Deal</span>
                          <select name="dealId" className="select" defaultValue={invoice.dealId ?? ""}>
                            <option value="">Optional deal</option>
                            {deals.map((deal) => (
                              <option key={deal.id} value={deal.id}>
                                {deal.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="two-up">
                          <label className="field">
                            <span>
                              Document type <HelpTip label="Choose whether this document is a proforma or a final invoice." />
                            </span>
                            <select name="kind" className="select" defaultValue={invoice.kind}>
                              <option value="PROFORMA">Proforma</option>
                              <option value="INVOICE">Invoice</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>
                              Status <HelpTip label="Set the invoice payment state such as draft, sent, paid, or overdue." />
                            </span>
                            <select name="status" className="select" defaultValue={invoice.status}>
                              <option value="DRAFT">Draft</option>
                              <option value="SENT">Sent</option>
                              <option value="PARTIAL">Partial</option>
                              <option value="PAID">Paid</option>
                              <option value="OVERDUE">Overdue</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </label>
                        </div>
                        <label className="field">
                          <span>Recipient email</span>
                          <input name="recipientEmail" className="input" type="email" defaultValue={invoice.recipientEmail ?? ""} />
                        </label>
                        <label className="field">
                          <span>Due date</span>
                          <input
                            name="dueDate"
                            type="date"
                            className="input"
                            defaultValue={invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : ""}
                          />
                        </label>
                        <div className="two-up">
                          <label className="field">
                            <span>Subtotal</span>
                            <input name="subtotal" type="number" min="0" step="1" className="input" defaultValue={invoice.subtotal} />
                          </label>
                          <label className="field">
                            <span>Tax</span>
                            <input name="tax" type="number" min="0" step="1" className="input" defaultValue={invoice.tax} />
                          </label>
                        </div>
                        <label className="field">
                          <span>Notes</span>
                          <textarea name="notes" className="textarea" rows={4} defaultValue={invoice.notes ?? ""} />
                        </label>
                        <div className="inline-actions">
                          <button type="submit" className="secondary-button">
                            Save document
                          </button>
                        </div>
                      </form>
                      <form action={deleteInvoiceAction} className="inline-actions danger-row">
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button type="submit" className="danger-button">
                          Delete document
                        </button>
                      </form>
                    </details>
                    <form action={updateInvoiceStatusAction} className="inline-form">
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <select name="status" defaultValue={invoice.status} className="select select-compact">
                        <option value="DRAFT">DRAFT</option>
                        <option value="SENT">SENT</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                      <button type="submit" className="secondary-button">
                        Update
                      </button>
                    </form>
                  </article>
                ))}
                {invoices.length === 0 ? <div className="empty-state">No invoices or proformas yet.</div> : null}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Create document</div>
                  <h2>New invoice / proforma</h2>
                </div>
              </div>

              <form action={createInvoiceAction} className="stack">
                <label className="field">
                  <span>Customer</span>
                  <select name="accountId" className="select" required defaultValue="">
                    <option value="" disabled>
                      Select customer
                    </option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Deal</span>
                  <select name="dealId" className="select" defaultValue="">
                    <option value="">Optional deal</option>
                    {deals.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="two-up">
                  <label className="field">
                    <span>
                      Document type <HelpTip label="Choose whether the new document should be a proforma or an invoice." />
                    </span>
                    <select name="kind" className="select" defaultValue="PROFORMA">
                      <option value="PROFORMA">Proforma</option>
                      <option value="INVOICE">Invoice</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>
                      Status <HelpTip label="Set the initial payment state for the new invoice or proforma." />
                    </span>
                    <select name="status" className="select" defaultValue="DRAFT">
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Recipient email</span>
                  <input name="recipientEmail" className="input" type="email" placeholder="billing@customer.com" />
                </label>

                <label className="field">
                  <span>Due date</span>
                  <input name="dueDate" type="date" className="input" />
                </label>

                <div className="two-up">
                  <label className="field">
                    <span>Subtotal</span>
                    <input name="subtotal" type="number" min="0" step="1" className="input" placeholder="185000" />
                  </label>
                  <label className="field">
                    <span>Tax</span>
                    <input name="tax" type="number" min="0" step="1" className="input" placeholder="0" />
                  </label>
                </div>

                <label className="field">
                  <span>Notes</span>
                  <textarea name="notes" className="textarea" rows={4} placeholder="Payment instructions, dispatch notes..." />
                </label>

                <button type="submit" className="primary-button full">
                  Create document
                </button>
              </form>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

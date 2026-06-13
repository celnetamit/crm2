import {
  createInvoiceAction,
  deleteInvoiceAction,
  updateInvoiceAction,
  updateInvoiceStatusAction,
} from "@/app/actions";
import { formatMoney, getBillingData, getShellData } from "@/lib/crm";

export default async function BillingPage() {
  const [{ session }, [invoices, accounts, deals]] = await Promise.all([getShellData(), getBillingData()]);
  const canManage = session.role !== "MEMBER";
  const totalOutstanding = invoices.reduce((sum, invoice) => {
    if (invoice.status === "PAID") return sum;
    return sum + invoice.total;
  }, 0);
  const overdueCount = invoices.filter((invoice) => invoice.status === "OVERDUE").length;

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Billing</div>
            <h2>Invoices and proformas in a softer finance workspace.</h2>
            <p>
              Keep payment documents, due dates, and delivery history visible without the heavy dark surfaces.
            </p>
          </div>

          <div className="hero-actions">
            <div className="chip">{invoices.length} documents</div>
            <div className="chip">{overdueCount} overdue</div>
            <div className="chip">{formatMoney(totalOutstanding)} outstanding</div>
          </div>

          <div className="metric-strip">
            <article className="metric-card">
              <div className="eyebrow">Documents</div>
              <div className="metric-value">{invoices.length}</div>
              <div className="deal-meta">Invoices and proformas</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Overdue</div>
              <div className="metric-value">{overdueCount}</div>
              <div className="deal-meta">Need attention</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Outstanding</div>
              <div className="metric-value">{formatMoney(totalOutstanding)}</div>
              <div className="deal-meta">Unpaid value</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Accounts</div>
              <div className="metric-value">{accounts.length}</div>
              <div className="deal-meta">Billable customers</div>
            </article>
          </div>
        </div>

        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">{session.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-copy">
                <h3>{session.organizationName}</h3>
                <span>Billing operations</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Collection focus</div>
              <div className="profile-track">
                <span style={{ width: "74%" }} />
              </div>
              <div className="deal-meta">Payments stay tied to accounts and deals.</div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{deals.length}</strong>
                <span>Deals</span>
              </div>
              <div className="profile-stat">
                <strong>{accounts.length}</strong>
                <span>Accounts</span>
              </div>
              <div className="profile-stat">
                <strong>{invoices.filter((invoice) => invoice.status === "PAID").length}</strong>
                <span>Paid</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Billing</div>
            <h2>Invoices and proformas</h2>
          </div>
        </div>

        <div className="stack">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="row-card">
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
              {canManage ? (
                <details className="edit-block">
                  <summary>Edit document</summary>
                  <form action={updateInvoiceAction} className="stack compact-form">
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <label className="field">
                      <span>Account</span>
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
                        <span>Document type</span>
                        <select name="kind" className="select" defaultValue={invoice.kind}>
                          <option value="PROFORMA">Proforma</option>
                          <option value="INVOICE">Invoice</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Status</span>
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
              ) : null}
              {canManage ? (
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
              ) : null}
            </article>
          ))}
          {invoices.length === 0 ? <div className="empty-state">No invoices or proformas yet.</div> : null}
        </div>
      </section>

      {canManage ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Create document</div>
              <h2>New invoice / proforma</h2>
            </div>
          </div>

          <form action={createInvoiceAction} className="stack">
            <label className="field">
              <span>Account</span>
              <select name="accountId" className="select" required defaultValue="">
                <option value="" disabled>
                  Select account
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
                <span>Document type</span>
                <select name="kind" className="select" defaultValue="PROFORMA">
                  <option value="PROFORMA">Proforma</option>
                  <option value="INVOICE">Invoice</option>
                </select>
              </label>
              <label className="field">
                <span>Status</span>
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
      ) : null}
    </div>
  );
}

import Link from "next/link";
import {
  createDealAction,
  deleteDealAction,
  updateDealAction,
  updateDealStageAction,
} from "@/app/actions";
import { HelpTip } from "@/components/help-tip";
import { getDealsData, formatMoney, getShellData } from "@/lib/crm";

type DealsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type DealsWorkspaceTab = "deals" | "pipeline" | "manage";

function normalizeTab(value: string | undefined): DealsWorkspaceTab {
  if (value === "pipeline" || value === "manage") return value;
  return "deals";
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = normalizeTab(firstValue(resolvedSearchParams.tab));
  const [{ session }, data] = await Promise.all([getShellData(), getDealsData()]);
  const canManage = session.role !== "MEMBER";
  const totalValue = data.stages.reduce(
    (sum, stage) => sum + stage.deals.reduce((stageSum, deal) => stageSum + deal.value, 0),
    0,
  );
  function buildTabHref(tab: DealsWorkspaceTab) {
    if (tab === "pipeline") return "/deals/pipeline";
    if (tab === "manage") return "/deals/manage";
    return "/deals";
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Deals</div>
            <h2>Deal index</h2>
            <div className="deal-meta">
              Start in the table view, switch to Pipeline when needed, and keep Manage for create/edit work.
            </div>
          </div>
          <div className="chip-row">
            <span className="chip">{data.deals.length} deals</span>
            <span className="chip">{formatMoney(totalValue)} pipeline value</span>
            <span className="chip">{data.stages.length} stages</span>
            <span className="chip">{data.users.length} owners</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header workspace-header">
          <div>
            <div className="eyebrow">Views</div>
            <h2>Deal tabs</h2>
          </div>
          <div className="workspace-tabs" role="tablist" aria-label="Deal workspace tabs">
            <Link
              href={buildTabHref("deals")}
              className={`workspace-tab${activeTab === "deals" ? " is-active" : ""}`}
              aria-current={activeTab === "deals" ? "page" : undefined}
            >
              <span>Deals</span>
              <span className="workspace-tab-count">{data.deals.length}</span>
            </Link>
            <Link
              href={buildTabHref("pipeline")}
              className={`workspace-tab${activeTab === "pipeline" ? " is-active" : ""}`}
              aria-current={activeTab === "pipeline" ? "page" : undefined}
            >
              <span>Pipeline</span>
              <span className="workspace-tab-count">{data.stages.length}</span>
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

        {activeTab === "deals" ? (
          <div className="stack">
            <div className="deal-meta">Table view for active opportunities. Detail and edit buttons jump into the pipeline tab.</div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Customer</th>
                  <th>Person</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.deals.map((deal) => (
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
                      <div className="deal-meta">{deal.contact?.name ?? "No primary person"}</div>
                      <div className="deal-meta">{deal.contact?.title ?? "No title"}</div>
                    </td>
                    <td>
                      <div className="deal-meta">{deal.stage.name}</div>
                      <div className="deal-meta">{deal.stage.color}</div>
                    </td>
                    <td>
                      <strong>{formatMoney(deal.value)}</strong>
                      <div className="deal-meta">{deal.currency}</div>
                    </td>
                    <td>
                      <div className="deal-meta">{deal.owner.name}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/deals/pipeline#deal-${deal.id}`} className="secondary-button table-action-button">
                          Detail
                        </Link>
                        <Link href={`/deals/pipeline#edit-deal-${deal.id}`} className="secondary-button table-action-button">
                          Edit
                        </Link>
                        <Link href={`/follow-ups?dealId=${deal.id}`} className="secondary-button table-action-button">
                          Follow-ups
                        </Link>
                        <details className="table-more">
                          <summary className="secondary-button table-action-button">More</summary>
                          <div className="table-more-menu">
                            <Link href={`/customers/${deal.account.id}`}>Customer</Link>
                            <Link href={`/customers/${deal.account.id}#people`}>People</Link>
                            <Link href="/billing">Billing</Link>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.deals.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">No deals yet.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "pipeline" ? (
          <div className="stack">
            <div className="deal-meta">Pipeline view for moving opportunities through stages and editing individual deals.</div>
            <div className="kanban">
              {data.stages.map((stage) => (
                <div key={stage.id} className="kanban-column">
                  <div className="kanban-header">
                    <span className="stage-dot" style={{ background: stage.color }} />
                    <div>
                      <strong>{stage.name}</strong>
                      <div>{stage.deals.length} deal(s)</div>
                    </div>
                  </div>
                  <div className="kanban-list">
                    {stage.deals.map((deal) => (
                      <article key={deal.id} className="deal-card" id={`deal-${deal.id}`}>
                        <div className="deal-topline">
                          <strong>{deal.name}</strong>
                          <span>{formatMoney(deal.value)}</span>
                        </div>
                        <div className="deal-meta">{deal.account.name}</div>
                        <div className="deal-meta">{deal.contact?.name ?? "No primary person"}</div>
                        <div className="deal-meta">Owner: {deal.owner.name}</div>
                        <form action={updateDealStageAction} className="stack">
                          <input type="hidden" name="dealId" value={deal.id} />
                          <select name="stageId" defaultValue={deal.stageId} className="select select-compact">
                            {data.stages.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                              </option>
                            ))}
                          </select>
                          <select
                            name="status"
                            defaultValue={deal.status}
                            className="select select-compact"
                            title="Choose whether this deal is open, won, or lost."
                          >
                            <option value="OPEN">Open</option>
                            <option value="WON">Won</option>
                            <option value="LOST">Lost</option>
                          </select>
                          <button type="submit" className="secondary-button">
                            Update
                          </button>
                        </form>
                        {canManage ? (
                          <details className="edit-block" id={`edit-deal-${deal.id}`}>
                            <summary>Edit deal</summary>
                            <form action={updateDealAction} className="stack compact-form">
                              <input type="hidden" name="dealId" value={deal.id} />
                              <label className="field">
                                <span>Customer</span>
                                <select name="accountId" className="select" defaultValue={deal.accountId}>
                                  {data.accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field">
                                <span>Person</span>
                                <select name="contactId" className="select" defaultValue={deal.contactId ?? ""}>
                                  <option value="">No person</option>
                                  {data.contacts.map((contact) => (
                                    <option key={contact.id} value={contact.id}>
                                      {contact.name} · {contact.account.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field">
                                <span>
                                  Stage <HelpTip label="Pick the current pipeline stage for this opportunity." />
                                </span>
                                <select name="stageId" className="select" defaultValue={deal.stageId}>
                                  {data.stages.map((candidate) => (
                                    <option key={candidate.id} value={candidate.id}>
                                      {candidate.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field">
                                <span>Owner</span>
                                <select name="ownerId" className="select" defaultValue={deal.owner.id}>
                                  <option value={deal.owner.id}>{deal.owner.name}</option>
                                  {data.users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                      {user.name} · {user.role}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field">
                                <span>Deal name</span>
                                <input name="name" className="input" defaultValue={deal.name} required />
                              </label>
                              <div className="two-up">
                                <label className="field">
                                  <span>Value</span>
                                  <input name="value" className="input" type="number" min="0" step="1" defaultValue={deal.value} />
                                </label>
                                <label className="field">
                                  <span>Currency</span>
                                  <input name="currency" className="input" defaultValue={deal.currency} />
                                </label>
                              </div>
                              <div className="two-up">
                                <label className="field">
                                  <span>Expected close</span>
                                  <input
                                    name="expectedClose"
                                    type="date"
                                    className="input"
                                    defaultValue={deal.expectedClose ? new Date(deal.expectedClose).toISOString().slice(0, 10) : ""}
                                  />
                                </label>
                                <label className="field">
                                  <span>Next action</span>
                                  <input
                                    name="nextActionAt"
                                    type="datetime-local"
                                    className="input"
                                    defaultValue={deal.nextActionAt ? new Date(deal.nextActionAt).toISOString().slice(0, 16) : ""}
                                  />
                                </label>
                              </div>
                              <label className="field">
                                <span>
                                  Status <HelpTip label="Mark the outcome of this deal: open, won, or lost." />
                                </span>
                                <select name="status" className="select" defaultValue={deal.status}>
                                  <option value="OPEN">Open</option>
                                  <option value="WON">Won</option>
                                  <option value="LOST">Lost</option>
                                </select>
                              </label>
                              <label className="field">
                                <span>Notes</span>
                                <textarea name="notes" className="textarea" rows={4} defaultValue={deal.notes ?? ""} />
                              </label>
                              <div className="inline-actions">
                                <button type="submit" className="secondary-button">
                                  Save deal
                                </button>
                              </div>
                            </form>
                            <form action={deleteDealAction} className="inline-actions danger-row">
                              <input type="hidden" name="dealId" value={deal.id} />
                              <button type="submit" className="danger-button">
                                Delete deal
                              </button>
                            </form>
                          </details>
                        ) : null}
                      </article>
                    ))}
                    {stage.deals.length === 0 ? <div className="empty-state">No deals here.</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "manage" && canManage ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Create deal</div>
                <h2>New opportunity</h2>
              </div>
            </div>

            <form action={createDealAction} className="stack">
              <label className="field">
                <span>Customer</span>
                <select name="accountId" className="select" required defaultValue="">
                  <option value="" disabled>
                    Select customer
                  </option>
                  {data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Person</span>
                <select name="contactId" className="select" defaultValue="">
                  <option value="">Optional person</option>
                  {data.contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} · {contact.account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>
                  Stage <HelpTip label="Choose the stage that best matches where the deal sits in the pipeline." />
                </span>
                <select name="stageId" className="select" required defaultValue="">
                  <option value="" disabled>
                    Select stage
                  </option>
                  {data.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Owner</span>
                <select name="ownerId" className="select" defaultValue="">
                  <option value="">Current user</option>
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Deal name</span>
                <input name="name" className="input" required placeholder="Annual renewal + archive access" />
              </label>

              <div className="two-up">
                <label className="field">
                  <span>Value</span>
                  <input name="value" className="input" type="number" min="0" step="1" placeholder="185000" />
                </label>
                <label className="field">
                  <span>Currency</span>
                  <input name="currency" className="input" defaultValue="INR" />
                </label>
              </div>

              <div className="two-up">
                <label className="field">
                  <span>Expected close</span>
                  <input name="expectedClose" type="date" className="input" />
                </label>
                <label className="field">
                  <span>Next action</span>
                  <input name="nextActionAt" type="datetime-local" className="input" />
                </label>
              </div>

              <label className="field">
                <span>Notes</span>
                <textarea name="notes" className="textarea" rows={5} placeholder="Key context, blockers, or scope..." />
              </label>

              <button type="submit" className="primary-button full">
                Create deal
              </button>
            </form>
          </section>
        ) : null}
      </section>
    </div>
  );
}

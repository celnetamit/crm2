import {
  createDealAction,
  deleteDealAction,
  updateDealAction,
  updateDealStageAction,
} from "@/app/actions";
import { getDealsData, formatMoney, getShellData } from "@/lib/crm";

export default async function DealsPage() {
  const [{ session }, data] = await Promise.all([getShellData(), getDealsData()]);
  const canManage = session.role !== "MEMBER";
  const totalValue = data.stages.reduce(
    (sum, stage) => sum + stage.deals.reduce((stageSum, deal) => stageSum + deal.value, 0),
    0,
  );
  const openDeals = data.stages.reduce((sum, stage) => sum + stage.deals.length, 0);

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Pipeline</div>
            <h2>Deal board with a softer, calmer operating feel.</h2>
            <p>
              Move opportunities through stages, keep ownership visible, and review the whole pipeline without the
              dark chrome.
            </p>
          </div>

          <div className="hero-actions">
            <div className="chip">{openDeals} open deals</div>
            <div className="chip">{formatMoney(totalValue)} pipeline value</div>
            <div className="chip">{data.users.length} deal owners</div>
          </div>

          <div className="metric-strip">
            <article className="metric-card">
              <div className="eyebrow">Stages</div>
              <div className="metric-value">{data.stages.length}</div>
              <div className="deal-meta">Board columns</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Deals</div>
              <div className="metric-value">{openDeals}</div>
              <div className="deal-meta">Visible opportunities</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Value</div>
              <div className="metric-value">{formatMoney(totalValue)}</div>
              <div className="deal-meta">Open pipeline total</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Accounts</div>
              <div className="metric-value">{data.accounts.length}</div>
              <div className="deal-meta">Linked customers</div>
            </article>
          </div>
        </div>

        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">{session.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-copy">
                <h3>{session.organizationName}</h3>
                <span>Deal progression</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Board health</div>
              <div className="profile-track">
                <span style={{ width: "68%" }} />
              </div>
              <div className="deal-meta">Pipeline is distributed across {data.stages.length} stages.</div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{data.contacts.length}</strong>
                <span>Contacts</span>
              </div>
              <div className="profile-stat">
                <strong>{data.users.length}</strong>
                <span>Owners</span>
              </div>
              <div className="profile-stat">
                <strong>{data.stages[0]?.deals.length ?? 0}</strong>
                <span>Lead stage</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Pipeline</div>
            <h2>Deal board</h2>
          </div>
        </div>

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
                  <article key={deal.id} className="deal-card">
                    <div className="deal-topline">
                      <strong>{deal.name}</strong>
                      <span>{formatMoney(deal.value)}</span>
                    </div>
                    <div className="deal-meta">{deal.account.name}</div>
                    <div className="deal-meta">{deal.contact?.name ?? "No primary contact"}</div>
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
                      <select name="status" defaultValue={deal.status} className="select select-compact">
                        <option value="OPEN">Open</option>
                        <option value="WON">Won</option>
                        <option value="LOST">Lost</option>
                      </select>
                      <button type="submit" className="secondary-button">
                        Update
                      </button>
                    </form>
                    {canManage ? (
                      <details className="edit-block">
                        <summary>Edit deal</summary>
                        <form action={updateDealAction} className="stack compact-form">
                          <input type="hidden" name="dealId" value={deal.id} />
                          <label className="field">
                            <span>Account</span>
                            <select name="accountId" className="select" defaultValue={deal.accountId}>
                              {data.accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Contact</span>
                            <select name="contactId" className="select" defaultValue={deal.contactId ?? ""}>
                              <option value="">No contact</option>
                              {data.contacts.map((contact) => (
                                <option key={contact.id} value={contact.id}>
                                  {contact.name} · {contact.account.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Stage</span>
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
                            <span>Status</span>
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
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Create deal</div>
            <h2>New opportunity</h2>
          </div>
        </div>

        <form action={createDealAction} className="stack">
          <label className="field">
            <span>Account</span>
            <select name="accountId" className="select" required defaultValue="">
              <option value="" disabled>
                Select account
              </option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Contact</span>
            <select name="contactId" className="select" defaultValue="">
              <option value="">Optional contact</option>
              {data.contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} · {contact.account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Stage</span>
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
    </div>
  );
}

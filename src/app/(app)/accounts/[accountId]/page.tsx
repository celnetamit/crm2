import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createAccountCommentAction,
  deleteAccountAction,
  deleteAccountCommentAction,
  deleteContactAction,
  updateAccountAction,
  updateAccountCommentAction,
  updateContactAction,
} from "@/app/actions";
import {
  getAccountDirectory,
  getAccountProfileData,
  getAccountTeamOptions,
  getShellData,
} from "@/lib/crm";
import {
  customFieldEntries,
  customFieldsTextareaValue,
  formatDate,
  formatMoney,
  getHealthTone,
  getProfileCompleteness,
  parseTags,
  toDateInputValue,
} from "@/lib/account-profile";

type AccountDetailPageProps = {
  params: Promise<{ accountId: string }>;
};

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { accountId } = await params;
  const [{ session }, profile, accountDirectory, teamOptions] = await Promise.all([
    getShellData(),
    getAccountProfileData(accountId),
    getAccountDirectory(),
    getAccountTeamOptions(),
  ]);

  if (!profile) notFound();

  const { account, auditEvents } = profile;
  const canManage = session.role !== "MEMBER";
  const tags = parseTags(account.tags);
  const fieldEntries = customFieldEntries(account.customFields);
  const profileCompleteness = getProfileCompleteness(account);

  function canEditComment(authorUserId: string) {
    return canManage || authorUserId === session.userId;
  }

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Customer profile</div>
            <h2>{account.name}</h2>
            <p>{account.profileSummary ?? account.notes ?? "No summary has been added for this customer yet."}</p>
          </div>
          <div className="hero-actions">
            <Link href="/accounts" className="secondary-button">
              Back to accounts
            </Link>
            <div className="chip">Owner {account.owner?.name ?? "Unassigned"}</div>
            <div className={`chip status-${getHealthTone(account.healthScore)}`}>Health {account.healthScore ?? "N/A"}</div>
            <div className="chip">{profileCompleteness}% complete</div>
          </div>
          <div className="metric-strip">
            <article className="metric-card">
              <div className="eyebrow">Revenue</div>
              <div className="metric-value">{formatMoney(account.annualRevenue)}</div>
              <div className="deal-meta">Commercial potential</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Contacts</div>
              <div className="metric-value">{account._count.contacts}</div>
              <div className="deal-meta">Mapped stakeholders</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Deals</div>
              <div className="metric-value">{account._count.deals}</div>
              <div className="deal-meta">Pipeline items</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Review</div>
              <div className="metric-value">{formatDate(account.nextReviewAt)}</div>
              <div className="deal-meta">Refresh window</div>
            </article>
          </div>
        </div>

        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">{account.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-copy">
                <h3>{account.lifecycleStage ?? "Lifecycle not set"}</h3>
                <span>{account.segment ?? "No segment"}</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Profile completeness</div>
              <div className="profile-track">
                <span style={{ width: `${profileCompleteness}%` }} />
              </div>
              <div className="deal-meta">{profileCompleteness}% of the account profile is populated.</div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{account.contacts.length}</strong>
                <span>Contacts</span>
              </div>
              <div className="profile-stat">
                <strong>{account.tasks.length}</strong>
                <span>Tasks</span>
              </div>
              <div className="profile-stat">
                <strong>{account.invoices.length}</strong>
                <span>Invoices</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="eyebrow">Completeness</div>
          <div className="stat-value">{profileCompleteness}%</div>
          <div className="deal-meta">Profile readiness</div>
        </article>
        <article className="stat-card">
          <div className="eyebrow">Lifecycle</div>
          <div className="stat-value">{account.lifecycleStage ?? "Unset"}</div>
          <div className="deal-meta">{account.status}</div>
        </article>
        <article className="stat-card">
          <div className="eyebrow">Revenue</div>
          <div className="stat-value">{formatMoney(account.annualRevenue)}</div>
          <div className="deal-meta">{account.companySize ?? "Size not set"}</div>
        </article>
        <article className="stat-card">
          <div className="eyebrow">Review</div>
          <div className="stat-value">{formatDate(account.nextReviewAt)}</div>
          <div className="deal-meta">{account.owner?.name ?? "Unassigned"} · {account.source ?? "Source not set"}</div>
        </article>
        <article className="stat-card">
          <div className="eyebrow">Contacts</div>
          <div className="stat-value">{account._count.contacts}</div>
          <div className="deal-meta">Stakeholders mapped</div>
        </article>
        <article className="stat-card">
          <div className="eyebrow">Open work</div>
          <div className="stat-value">{account._count.tasks}</div>
          <div className="deal-meta">{account._count.deals} deals in motion</div>
        </article>
      </section>

      <div className="dual-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Profile</div>
              <h2>Company and commercial context</h2>
            </div>
          </div>
          <div className="account-facts-grid">
            <div className="nested-card">
              <strong className="section-label">Core facts</strong>
              <div className="deal-meta">Industry: {account.industry ?? "Not set"}</div>
              <div className="deal-meta">Website: {account.website ?? "Not set"}</div>
              <div className="deal-meta">Headquarters: {account.headquarters ?? "Not set"}</div>
              <div className="deal-meta">Segment: {account.segment ?? "Not set"}</div>
              <div className="deal-meta">Lifecycle stage: {account.lifecycleStage ?? "Not set"}</div>
              <div className="deal-meta">Owner: {account.owner?.name ?? "Unassigned"}</div>
            </div>
            <div className="nested-card">
              <strong className="section-label">Signals</strong>
              <div className="chip-row">
                {tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
                {tags.length === 0 ? <span className="chip">No tags</span> : null}
              </div>
              <div className="deal-meta">Notes: {account.notes ?? "No internal notes."}</div>
            </div>
          </div>
          <div className="nested-card">
            <strong className="section-label">Custom fields</strong>
            <div className="stack compact-stack">
              {fieldEntries.map(([key, value]) => (
                <div key={key} className="activity-line">
                  <strong>{key}</strong>
                  <div className="deal-meta">{value}</div>
                </div>
              ))}
              {fieldEntries.length === 0 ? <div className="deal-meta">No custom fields captured yet.</div> : null}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Contacts</div>
              <h2>People and influence map</h2>
            </div>
          </div>
          <div className="stack">
            {account.contacts.map((contact) => (
              <article key={contact.id} className="row-card">
                <div className="row-card-top">
                  <div>
                    <strong>{contact.name}</strong>
                    <div className="deal-meta">
                      {contact.role} · {contact.title ?? "No title"}
                    </div>
                  </div>
                  <div className="account-profile-side">
                    {contact.influenceLevel ? <span className="badge status-warning">{contact.influenceLevel}</span> : null}
                    <span className="badge status-draft">{contact.preferredChannel ?? "No channel"}</span>
                  </div>
                </div>
                <div className="deal-meta">{contact.department ?? "No department"} · {contact.email ?? "No email"}</div>
                <div className="deal-meta">{contact.phone ?? "No phone"} · Last contacted: {formatDate(contact.lastContactedAt)}</div>
                {contact.notes ? <div className="deal-meta">{contact.notes}</div> : null}
                {canManage ? (
                  <details className="edit-block">
                    <summary>Edit contact</summary>
                    <form action={updateContactAction} className="stack compact-form">
                      <input type="hidden" name="contactId" value={contact.id} />
                      <label className="field">
                        <span>Account</span>
                        <select name="accountId" className="select" defaultValue={account.id}>
                          {accountDirectory.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="two-up">
                        <label className="field">
                          <span>Name</span>
                          <input name="name" className="input" defaultValue={contact.name} required />
                        </label>
                        <label className="field">
                          <span>Role</span>
                          <input name="role" className="input" defaultValue={contact.role} required />
                        </label>
                      </div>
                      <div className="two-up">
                        <label className="field">
                          <span>Title</span>
                          <input name="title" className="input" defaultValue={contact.title ?? ""} />
                        </label>
                        <label className="field">
                          <span>Department</span>
                          <input name="department" className="input" defaultValue={contact.department ?? ""} />
                        </label>
                      </div>
                      <div className="two-up">
                        <label className="field">
                          <span>Email</span>
                          <input name="email" className="input" type="email" defaultValue={contact.email ?? ""} />
                        </label>
                        <label className="field">
                          <span>Phone</span>
                          <input name="phone" className="input" defaultValue={contact.phone ?? ""} />
                        </label>
                      </div>
                      <div className="two-up">
                        <label className="field">
                          <span>Influence level</span>
                          <input name="influenceLevel" className="input" defaultValue={contact.influenceLevel ?? ""} />
                        </label>
                        <label className="field">
                          <span>Preferred channel</span>
                          <input name="preferredChannel" className="input" defaultValue={contact.preferredChannel ?? ""} />
                        </label>
                      </div>
                      <label className="field">
                        <span>LinkedIn URL</span>
                        <input name="linkedinUrl" className="input" defaultValue={contact.linkedinUrl ?? ""} />
                      </label>
                      <label className="field">
                        <span>Notes</span>
                        <textarea name="notes" className="textarea" rows={4} defaultValue={contact.notes ?? ""} />
                      </label>
                      <div className="inline-actions">
                        <button type="submit" className="secondary-button">
                          Save
                        </button>
                      </div>
                    </form>
                    <form action={deleteContactAction} className="inline-actions danger-row">
                      <input type="hidden" name="contactId" value={contact.id} />
                      <button type="submit" className="danger-button">
                        Delete contact
                      </button>
                    </form>
                  </details>
                ) : null}
              </article>
            ))}
            {account.contacts.length === 0 ? <div className="empty-state">No contacts mapped yet.</div> : null}
          </div>
        </section>
      </div>

      <div className="dual-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Pipeline and work</div>
              <h2>Deals, tasks, and invoices</h2>
            </div>
          </div>
          <div className="stack">
            <div className="nested-card">
              <strong>Deals</strong>
              <div className="stack compact-stack">
                {account.deals.map((deal) => (
                  <div key={deal.id} className="activity-line">
                    <div>
                      <strong>{deal.name}</strong>
                      <div className="deal-meta">
                        {deal.stage.name} · {deal.contact?.name ?? "No primary contact"}
                      </div>
                    </div>
                    <div className="deal-meta">{formatMoney(deal.value)}</div>
                  </div>
                ))}
                {account.deals.length === 0 ? <div className="deal-meta">No deals on this account.</div> : null}
              </div>
            </div>
            <div className="nested-card">
              <strong>Tasks</strong>
              <div className="stack compact-stack">
                {account.tasks.map((task) => (
                  <div key={task.id} className="activity-line">
                    <div>
                      <strong>{task.title}</strong>
                      <div className="deal-meta">
                        {task.contact?.name ?? "General"} · {task.assignedTo.name}
                      </div>
                    </div>
                    <div className="deal-meta">{formatDate(task.dueAt)}</div>
                  </div>
                ))}
                {account.tasks.length === 0 ? <div className="deal-meta">No tasks on this account.</div> : null}
              </div>
            </div>
            <div className="nested-card">
              <strong>Invoices</strong>
              <div className="stack compact-stack">
                {account.invoices.map((invoice) => (
                  <div key={invoice.id} className="activity-line">
                    <div>
                      <strong>{invoice.invoiceNumber}</strong>
                      <div className="deal-meta">
                        {invoice.kind} · {invoice.status}
                      </div>
                    </div>
                    <div className="deal-meta">{formatMoney(invoice.total)}</div>
                  </div>
                ))}
                {account.invoices.length === 0 ? <div className="deal-meta">No invoices yet.</div> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Notes</div>
              <h2>Customer notes and profiling updates</h2>
            </div>
          </div>
          <div className="stack">
            <form action={createAccountCommentAction} className="nested-card">
              <input type="hidden" name="accountId" value={account.id} />
              <div className="two-up">
                <label className="field">
                  <span>Title</span>
                  <input name="title" className="input" placeholder="Renewal call summary" />
                </label>
                <label className="field">
                  <span>Category</span>
                  <input name="category" className="input" placeholder="RENEWAL, RISK, GENERAL..." />
                </label>
              </div>
              <label className="field">
                <span>Comment</span>
                <textarea name="body" className="textarea" rows={4} required placeholder="What changed, what matters, and what we should do next..." />
              </label>
              {canManage ? (
                <label className="field checkbox-field">
                  <input type="checkbox" name="pinned" />
                  <span>Pin this note to the top</span>
                </label>
              ) : null}
              <div className="inline-actions">
                <button type="submit" className="primary-button">
                  Add note
                </button>
              </div>
            </form>
            
            {account.comments.map((comment) => (
              <article key={comment.id} className="row-card">
                <div className="row-card-top">
                  <div>
                    <strong>{comment.title ?? comment.category}</strong>
                    <div className="deal-meta">
                      {comment.category} · {comment.author.name}
                    </div>
                  </div>
                  <div className="account-profile-side">
                    {comment.pinned ? <span className="badge status-warning">PINNED</span> : null}
                    {comment.revisions.length > 0 ? <span className="badge status-draft">Edited {comment.revisions.length}x</span> : null}
                    <span className="deal-meta">{new Date(comment.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="deal-meta">{comment.body}</div>
                {comment.updatedAt.getTime() !== comment.createdAt.getTime() ? (
                  <div className="deal-meta">Last updated {new Date(comment.updatedAt).toLocaleString("en-IN")}</div>
                ) : null}
                {comment.revisions.length > 0 ? (
                  <details className="nested-card">
                    <summary>View note history</summary>
                    <div className="stack compact-stack">
                      {comment.revisions.map((revision) => (
                        <div key={revision.id} className="activity-line">
                          <div>
                            <strong>Version {revision.versionNumber}</strong>
                            <div className="deal-meta">
                              {revision.category} · saved by {revision.author.name}
                            </div>
                            <div className="deal-meta">{revision.title ?? "Untitled note"}</div>
                            <div className="deal-meta">{revision.body}</div>
                          </div>
                          <div className="deal-meta">{new Date(revision.createdAt).toLocaleString("en-IN")}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                {canEditComment(comment.authorUserId) ? (
                  <details className="edit-block">
                    <summary>Edit note</summary>
                    <form action={updateAccountCommentAction} className="stack compact-form">
                      <input type="hidden" name="commentId" value={comment.id} />
                      <input type="hidden" name="accountId" value={account.id} />
                      <div className="two-up">
                        <label className="field">
                          <span>Title</span>
                          <input name="title" className="input" defaultValue={comment.title ?? ""} />
                        </label>
                        <label className="field">
                          <span>Category</span>
                          <input name="category" className="input" defaultValue={comment.category} />
                        </label>
                      </div>
                      <label className="field">
                        <span>Comment</span>
                        <textarea name="body" className="textarea" rows={4} defaultValue={comment.body} required />
                      </label>
                      {canManage ? (
                        <label className="field checkbox-field">
                          <input type="checkbox" name="pinned" defaultChecked={comment.pinned} />
                          <span>Pin this note</span>
                        </label>
                      ) : null}
                      <div className="inline-actions">
                        <button type="submit" className="secondary-button">
                          Save note
                        </button>
                      </div>
                    </form>
                    <form action={deleteAccountCommentAction} className="inline-actions">
                      <input type="hidden" name="commentId" value={comment.id} />
                      <input type="hidden" name="accountId" value={account.id} />
                      <button type="submit" className="danger-button">
                        Delete note
                      </button>
                    </form>
                  </details>
                ) : null}
              </article>
            ))}
            {account.comments.length === 0 ? <div className="empty-state">No structured notes added yet.</div> : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Timeline</div>
            <h2>Recent account history</h2>
          </div>
        </div>
        <div className="stack">
          {auditEvents.map((event) => (
            <article key={event.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{event.action}</strong>
                  <div className="deal-meta">
                    {event.entityType} · {event.actor?.name ?? "System"}
                  </div>
                </div>
                <div className="deal-meta">{new Date(event.createdAt).toLocaleString("en-IN")}</div>
              </div>
              <div className="deal-meta">{event.details ?? "No details"}</div>
            </article>
          ))}
          {auditEvents.length === 0 ? <div className="empty-state">No account activity has been logged yet.</div> : null}
        </div>
      </section>

      {canManage ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Admin</div>
              <h2>Edit account profile</h2>
            </div>
          </div>
          <form action={updateAccountAction} className="stack">
            <input type="hidden" name="accountId" value={account.id} />
            <div className="two-up">
              <label className="field">
                <span>Account owner</span>
                <select name="ownerUserId" className="select" defaultValue={account.owner?.id ?? ""}>
                  <option value="">Unassigned</option>
                  {teamOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Name</span>
                <input name="name" className="input" defaultValue={account.name} required />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Industry</span>
                <input name="industry" className="input" defaultValue={account.industry ?? ""} />
              </label>
              <label className="field">
                <span>Website</span>
                <input name="website" className="input" defaultValue={account.website ?? ""} />
              </label>
              <label className="field">
                <span>Status</span>
                <select name="status" className="select" defaultValue={account.status}>
                  <option value="ACTIVE">Active</option>
                  <option value="AT_RISK">At risk</option>
                  <option value="PROSPECT">Prospect</option>
                </select>
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Lifecycle stage</span>
                <input name="lifecycleStage" className="input" defaultValue={account.lifecycleStage ?? ""} />
              </label>
              <label className="field">
                <span>Segment</span>
                <input name="segment" className="input" defaultValue={account.segment ?? ""} />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Source</span>
                <input name="source" className="input" defaultValue={account.source ?? ""} />
              </label>
              <label className="field">
                <span>Tags</span>
                <input name="tags" className="input" defaultValue={account.tags ?? ""} />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Headquarters</span>
                <input name="headquarters" className="input" defaultValue={account.headquarters ?? ""} />
              </label>
              <label className="field">
                <span>Company size</span>
                <input name="companySize" className="input" defaultValue={account.companySize ?? ""} />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Annual revenue</span>
                <input name="annualRevenue" className="input" type="number" min="0" step="1000" defaultValue={account.annualRevenue ?? ""} />
              </label>
              <label className="field">
                <span>Health score</span>
                <input name="healthScore" className="input" type="number" min="0" max="100" defaultValue={account.healthScore ?? ""} />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Next review date</span>
                <input name="nextReviewAt" className="input" type="date" defaultValue={toDateInputValue(account.nextReviewAt)} />
              </label>
              <label className="field">
                <span>Profile summary</span>
                <input name="profileSummary" className="input" defaultValue={account.profileSummary ?? ""} />
              </label>
            </div>
            <label className="field">
              <span>Custom fields</span>
              <textarea name="customFields" className="textarea" rows={5} defaultValue={customFieldsTextareaValue(account.customFields)} />
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea name="notes" className="textarea" rows={5} defaultValue={account.notes ?? ""} />
            </label>
            <div className="inline-actions">
              <button type="submit" className="primary-button">
                Save profile
              </button>
            </div>
          </form>
          <form action={deleteAccountAction} className="inline-actions danger-row">
            <input type="hidden" name="accountId" value={account.id} />
            <button type="submit" className="danger-button" disabled={account._count.invoices > 0}>
              Delete account
            </button>
            {account._count.invoices > 0 ? <span className="deal-meta">Remove invoices first before deleting.</span> : null}
          </form>
        </section>
      ) : null}
    </div>
  );
}

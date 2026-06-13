import Link from "next/link";
import {
  bulkUpdateAccountsAction,
  createAccountAction,
  createContactAction,
  deleteAccountAction,
  deleteContactAction,
  updateAccountAction,
  updateContactAction,
} from "@/app/actions";
import {
  getAccountDirectory,
  getAccountFilterOptions,
  getAccountsData,
  getAccountSavedViews,
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
import { CsvImportTools } from "@/components/csv-import-tools";

type AccountsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const lifecycleOptions = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Onboarding",
  "Active Customer",
  "Renewal",
  "Expansion",
  "Churn Risk",
] as const;

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = {
    query: firstValue(resolvedSearchParams.q) ?? "",
    status: firstValue(resolvedSearchParams.status) ?? "",
    lifecycleStage: firstValue(resolvedSearchParams.lifecycleStage) ?? "",
    segment: firstValue(resolvedSearchParams.segment) ?? "",
    ownerUserId: firstValue(resolvedSearchParams.ownerUserId) ?? "",
    view: firstValue(resolvedSearchParams.view) ?? "",
  };

  const [{ session }, accounts, options, accountDirectory, savedViews, teamOptions] = await Promise.all([
    getShellData(),
    getAccountsData(filters),
    getAccountFilterOptions(),
    getAccountDirectory(),
    getAccountSavedViews(),
    getAccountTeamOptions(),
  ]);
  const canManage = session.role !== "MEMBER";

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Accounts</div>
            <h2>Customer profiling workspace</h2>
            <p>
              Search the book of business, segment customers by lifecycle stage, and move from overview into a full
              profile with people, revenue, follow-ups, and history.
            </p>
          </div>
          <div className="hero-actions">
            <div className="chip">{accounts.length} matching accounts</div>
            <div className="chip">
              {accounts.reduce((sum, account) => sum + account._count.contacts, 0)} mapped contacts
            </div>
            <div className="chip">{savedViews.length} saved views</div>
          </div>
        </div>
        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">A</div>
              <div className="profile-copy">
                <h3>Profiling cockpit</h3>
                <span>Search, filter, and bulk update customer records.</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Current scope</div>
              <div className="profile-track">
                <span style={{ width: "64%" }} />
              </div>
              <div className="deal-meta">
                {filters.view
                  ? `Saved view: ${savedViews.find((view) => view.id === filters.view)?.name ?? filters.view}`
                  : "All accounts"}
              </div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{savedViews.length}</strong>
                <span>Views</span>
              </div>
              <div className="profile-stat">
                <strong>{teamOptions.length}</strong>
                <span>Owners</span>
              </div>
              <div className="profile-stat">
                <strong>{options.segments.length}</strong>
                <span>Segments</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Filters</div>
            <h2>Search and saved segments</h2>
          </div>
        </div>
        <form method="get" className="stack">
          <div className="chip-row">
            {savedViews.map((view) => {
              const isActive =
                filters.view === view.id || (view.id === "my-book" && filters.ownerUserId === session.userId);

              return (
                <Link key={view.id} href={view.href} className={isActive ? "primary-button" : "secondary-button"}>
                  {view.name} · {view.count}
                </Link>
              );
            })}
          </div>
          <div className="account-facts-grid">
            {savedViews.map((view) => (
              <div key={view.id} className="nested-card">
                <strong>{view.name}</strong>
                <div className="deal-meta">{view.description}</div>
              </div>
            ))}
          </div>
          <input type="hidden" name="view" value={filters.view} />
          <div className="two-up">
            <label className="field">
              <span>Search</span>
              <input
                name="q"
                className="input"
                defaultValue={filters.query}
                placeholder="Account, industry, source, contact..."
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" className="select" defaultValue={filters.status}>
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="AT_RISK">At risk</option>
                <option value="PROSPECT">Prospect</option>
              </select>
            </label>
          </div>
          <div className="two-up">
            <label className="field">
              <span>Lifecycle stage</span>
              <select name="lifecycleStage" className="select" defaultValue={filters.lifecycleStage}>
                <option value="">All lifecycle stages</option>
                {Array.from(new Set([...lifecycleOptions, ...options.lifecycleStages])).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Segment</span>
              <select name="segment" className="select" defaultValue={filters.segment}>
                <option value="">All segments</option>
                {options.segments.map((segment) => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-up">
            <label className="field">
              <span>Account owner</span>
              <select name="ownerUserId" className="select" defaultValue={filters.ownerUserId}>
                <option value="">All owners</option>
                {teamOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.role}
                  </option>
                ))}
              </select>
            </label>
            <div className="nested-card">
              <strong>Current scope</strong>
              <div className="deal-meta">
                {filters.view ? `Saved view: ${savedViews.find((view) => view.id === filters.view)?.name ?? filters.view}` : "Saved view: none"}
              </div>
              <div className="deal-meta">
                {filters.ownerUserId
                  ? `Owner: ${teamOptions.find((member) => member.id === filters.ownerUserId)?.name ?? "Assigned"}`
                  : "Owner: all"}
              </div>
            </div>
          </div>
          <div className="inline-actions">
            <button type="submit" className="primary-button">
              Apply filters
            </button>
            <Link href="/accounts" className="secondary-button">
              Reset
            </Link>
          </div>
        </form>
      </section>

      {canManage ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">CSV tools</div>
              <h2>Import and export records</h2>
            </div>
          </div>
          <div className="dual-grid">
            <div className="stack">
              <div className="inline-actions">
                <Link href="/api/accounts/export" className="secondary-button">
                  Export accounts CSV
                </Link>
                <Link href="/api/contacts/export" className="secondary-button">
                  Export contacts CSV
                </Link>
                <Link href="/api/accounts/template" className="secondary-button">
                  Accounts template
                </Link>
                <Link href="/api/contacts/template" className="secondary-button">
                  Contacts template
                </Link>
              </div>
              <div className="deal-meta">
                Account import expects columns like `name`, `status`, `lifecycleStage`, `segment`, `customFields`,
                and `notes`. Contact import expects `accountName`, `name`, `role`, and optional contact profile
                fields.
              </div>
            </div>
            <div className="stack">
              <CsvImportTools />
            </div>
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Bulk actions</div>
              <h2>Reassign tags and owners</h2>
            </div>
          </div>
          <form id="bulk-reassign-form" action={bulkUpdateAccountsAction} className="stack">
            <label className="field checkbox-field">
              <input type="checkbox" name="applyOwnerChange" defaultChecked />
              <span>Apply owner change</span>
            </label>
            <label className="field">
              <span>New owner</span>
              <select name="ownerUserId" className="select" defaultValue="">
                <option value="">Unassigned</option>
                {teamOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="field checkbox-field">
              <input type="checkbox" name="applyTagChange" />
              <span>Apply tag change</span>
            </label>
            <div className="two-up">
              <label className="field">
                <span>Tag mode</span>
                <select name="tagMode" className="select" defaultValue="REPLACE">
                  <option value="REPLACE">Replace tags</option>
                  <option value="APPEND">Append tags</option>
                  <option value="REMOVE">Remove tags</option>
                </select>
              </label>
              <label className="field">
                <span>Tags</span>
                <input
                  name="tags"
                  className="input"
                  placeholder="Renewal, VIP, Expansion"
                />
              </label>
            </div>
            <div className="deal-meta">
              Tick the accounts below, then update owner fields and/or tags in one pass.
            </div>
            <div className="inline-actions">
              <button type="submit" className="primary-button">
                Apply bulk update
              </button>
              <button
                type="submit"
                className="secondary-button"
                formAction="/api/accounts/export-selected"
                formMethod="post"
              >
                Export selected
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Profiles</div>
            <h2>Customer organizations</h2>
          </div>
        </div>

        <div className="stack">
          {accounts.map((account) => {
            const tags = parseTags(account.tags);
            const profileCompleteness = getProfileCompleteness(account);
            const fieldEntries = customFieldEntries(account.customFields);

            return (
              <article key={account.id} className="row-card account-profile-card">
                <div className="row-card-top">
                  <div>
                    <strong>{account.name}</strong>
                    <div className="deal-meta">
                      {account.industry ?? "Unspecified industry"} · {account.lifecycleStage ?? "Lifecycle not set"} ·{" "}
                      {account.segment ?? "Unsegmented"}
                    </div>
                    <div className="deal-meta">Owner: {account.owner?.name ?? "Unassigned"}</div>
                  </div>
                    <div className="account-profile-side">
                    {canManage ? (
                      <label className="deal-meta checkbox-field">
                        <input type="checkbox" form="bulk-reassign-form" name="accountIds" value={account.id} />
                        <span>Pick</span>
                      </label>
                    ) : null}
                    <span className={`badge status-${account.status.toLowerCase()}`}>{account.status}</span>
                    <span className="badge status-draft">{account.lifecycleStage ?? "No stage"}</span>
                    <span className={`badge status-${getHealthTone(account.healthScore)}`}>
                      Health {account.healthScore ?? "N/A"}
                    </span>
                  </div>
                </div>

                <div className="deal-meta">
                  {account.profileSummary ?? account.notes ?? "No profile summary added yet."}
                </div>

                <div className="account-kpi-grid">
                  <div className="nested-card">
                    <strong>Profile completeness</strong>
                    <div className="row-card-value">{profileCompleteness}%</div>
                    <div className="deal-meta">Measures how much core profile context is already captured.</div>
                  </div>
                  <div className="nested-card">
                    <strong>Revenue potential</strong>
                    <div className="row-card-value">{formatMoney(account.annualRevenue)}</div>
                    <div className="deal-meta">{account.companySize ?? "Company size not set"}</div>
                  </div>
                  <div className="nested-card">
                    <strong>Next review</strong>
                    <div className="row-card-value">{formatDate(account.nextReviewAt)}</div>
                    <div className="deal-meta">
                      {account.owner?.name ?? "Unassigned"} · {account.source ?? "Source not set"}
                    </div>
                  </div>
                  <div className="nested-card">
                    <strong>Relationship map</strong>
                    <div className="row-card-value">{account._count.contacts} contacts</div>
                    <div className="deal-meta">
                      {account._count.deals} deals · {account._count.tasks} tasks · {account._count.invoices} invoices
                    </div>
                  </div>
                </div>

                <div className="account-facts-grid">
                  <div className="nested-card">
                    <strong className="section-label">Company facts</strong>
                    <div className="deal-meta">Website: {account.website ?? "Not set"}</div>
                    <div className="deal-meta">Headquarters: {account.headquarters ?? "Not set"}</div>
                    <div className="deal-meta">Segment: {account.segment ?? "Not set"}</div>
                    <div className="deal-meta">Lifecycle: {account.lifecycleStage ?? "Not set"}</div>
                    <div className="deal-meta">Owner: {account.owner?.name ?? "Unassigned"}</div>
                  </div>
                  <div className="nested-card">
                    <strong className="section-label">Tags and custom fields</strong>
                    <div className="chip-row">
                      {tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                      {tags.length === 0 ? <span className="chip">No tags</span> : null}
                    </div>
                    {fieldEntries.slice(0, 3).map(([key, value]) => (
                      <div key={key} className="deal-meta">
                        {key}: {value}
                      </div>
                    ))}
                    {fieldEntries.length === 0 ? <div className="deal-meta">No custom fields.</div> : null}
                  </div>
                </div>

                <div className="account-sections-grid">
                  <div className="stack">
                    <strong className="section-label">Key contacts</strong>
                    {account.contacts.slice(0, 3).map((contact) => (
                      <article key={contact.id} className="nested-card">
                        <div className="row-card-top">
                          <div>
                            <strong>{contact.name}</strong>
                            <div className="deal-meta">
                              {contact.role} · {contact.title ?? "No title"}
                            </div>
                          </div>
                          <div className="account-profile-side">
                            {contact.influenceLevel ? (
                              <span className="badge status-warning">{contact.influenceLevel}</span>
                            ) : null}
                            <span className="badge status-draft">CONTACT</span>
                          </div>
                        </div>
                        <div className="deal-meta">
                          {contact.department ?? "No department"} · {contact.preferredChannel ?? "Channel unknown"}
                        </div>
                        <div className="deal-meta">{contact.email ?? "No email"} · {contact.phone ?? "No phone"}</div>

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
                    {account.contacts.length === 0 ? <div className="empty-state">No contacts on this account.</div> : null}
                  </div>

                  <div className="stack">
                    <strong className="section-label">Recent account activity</strong>
                    <div className="nested-card">
                      <strong>Deals</strong>
                      <div className="stack compact-stack">
                        {account.deals.map((deal) => (
                          <div key={deal.id} className="activity-line">
                            <div>
                              <strong>{deal.name}</strong>
                              <div className="deal-meta">{deal.stage.name}</div>
                            </div>
                            <div className="deal-meta">{deal.owner.name}</div>
                          </div>
                        ))}
                        {account.deals.length === 0 ? <div className="deal-meta">No recent deals.</div> : null}
                      </div>
                    </div>
                    <div className="inline-actions">
                      <Link href={`/accounts/${account.id}`} className="primary-button">
                        Open full profile
                      </Link>
                    </div>
                  </div>
                </div>

                {canManage ? (
                  <details className="edit-block">
                    <summary>Edit account profile</summary>
                    <form action={updateAccountAction} className="stack compact-form">
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
                        <textarea
                          name="customFields"
                          className="textarea"
                          rows={4}
                          defaultValue={customFieldsTextareaValue(account.customFields)}
                          placeholder={"Contract owner: A. Sharma\nRegion: South India"}
                        />
                      </label>
                      <label className="field">
                        <span>Notes</span>
                        <textarea name="notes" className="textarea" rows={4} defaultValue={account.notes ?? ""} />
                      </label>
                      <div className="inline-actions">
                        <button type="submit" className="secondary-button">
                          Save account
                        </button>
                      </div>
                    </form>
                    <form action={deleteAccountAction} className="inline-actions danger-row">
                      <input type="hidden" name="accountId" value={account.id} />
                      <button type="submit" className="danger-button" disabled={account._count.invoices > 0}>
                        Delete account
                      </button>
                      {account._count.invoices > 0 ? (
                        <span className="deal-meta">Remove invoices first before deleting.</span>
                      ) : null}
                    </form>
                  </details>
                ) : null}
              </article>
            );
          })}
          {accounts.length === 0 ? <div className="empty-state">No accounts match these filters yet.</div> : null}
        </div>
      </section>

      <div className="dual-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Create account</div>
              <h2>New customer profile</h2>
            </div>
          </div>
          <form action={createAccountAction} className="stack">
            <div className="two-up">
              <label className="field">
                <span>Account owner</span>
                <select name="ownerUserId" className="select" defaultValue="">
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
                <input name="name" className="input" placeholder="Aster Biotech" required />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Industry</span>
                <input name="industry" className="input" placeholder="Publishing, biotech, education..." />
              </label>
              <label className="field">
                <span>Website</span>
                <input name="website" className="input" placeholder="https://example.com" />
              </label>
              <label className="field">
                <span>Status</span>
                <select name="status" className="select">
                  <option value="ACTIVE">Active</option>
                  <option value="AT_RISK">At risk</option>
                  <option value="PROSPECT">Prospect</option>
                </select>
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Lifecycle stage</span>
                <input name="lifecycleStage" className="input" placeholder="Lead, onboarding, renewal..." />
              </label>
              <label className="field">
                <span>Segment</span>
                <input name="segment" className="input" placeholder="Enterprise, SMB, academic..." />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Source</span>
                <input name="source" className="input" placeholder="Referral, outbound, inbound..." />
              </label>
              <label className="field">
                <span>Tags</span>
                <input name="tags" className="input" placeholder="Renewal, VIP, Expansion" />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Headquarters</span>
                <input name="headquarters" className="input" placeholder="Bengaluru, India" />
              </label>
              <label className="field">
                <span>Company size</span>
                <input name="companySize" className="input" placeholder="50-200 employees" />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Annual revenue</span>
                <input name="annualRevenue" className="input" type="number" min="0" step="1000" />
              </label>
              <label className="field">
                <span>Health score</span>
                <input name="healthScore" className="input" type="number" min="0" max="100" />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Next review date</span>
                <input name="nextReviewAt" className="input" type="date" />
              </label>
              <label className="field">
                <span>Profile summary</span>
                <input name="profileSummary" className="input" placeholder="Summary of fit, need, and buying motion" />
              </label>
            </div>
            <label className="field">
              <span>Custom fields</span>
              <textarea
                name="customFields"
                className="textarea"
                rows={4}
                placeholder={"Region: South India\nRenewal month: October"}
              />
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea name="notes" className="textarea" rows={4} placeholder="Context for the team..." />
            </label>
            <button type="submit" className="primary-button full">
              Create account
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Add contact</div>
              <h2>Relationship profile</h2>
            </div>
          </div>
          <form action={createContactAction} className="stack">
            <label className="field">
              <span>Account</span>
              <select name="accountId" className="select" required defaultValue="">
                <option value="" disabled>
                  Select account
                </option>
                {accountDirectory.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="two-up">
              <label className="field">
                <span>Name</span>
                <input name="name" className="input" required placeholder="Dr. Ramesh Kulkarni" />
              </label>
              <label className="field">
                <span>Role</span>
                <input name="role" className="input" required placeholder="Procurement, finance, admin..." />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Title</span>
                <input name="title" className="input" placeholder="Head Librarian" />
              </label>
              <label className="field">
                <span>Department</span>
                <input name="department" className="input" placeholder="Operations, library, finance..." />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Email</span>
                <input name="email" className="input" type="email" placeholder="person@customer.com" />
              </label>
              <label className="field">
                <span>Phone</span>
                <input name="phone" className="input" placeholder="+91..." />
              </label>
            </div>
            <div className="two-up">
              <label className="field">
                <span>Influence level</span>
                <input name="influenceLevel" className="input" placeholder="Champion, approver, blocker..." />
              </label>
              <label className="field">
                <span>Preferred channel</span>
                <input name="preferredChannel" className="input" placeholder="Email, phone, WhatsApp..." />
              </label>
            </div>
            <label className="field">
              <span>LinkedIn URL</span>
              <input name="linkedinUrl" className="input" placeholder="https://linkedin.com/in/..." />
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea
                name="notes"
                className="textarea"
                rows={4}
                placeholder="Stakeholder context, objections, influence, and history..."
              />
            </label>
            <button type="submit" className="primary-button full">
              Create contact
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

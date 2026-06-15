import Link from "next/link";
import {
  createOrganizationAction,
  removeMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
  updateOrganizationAction,
} from "@/app/actions";
import { HelpTip } from "@/components/help-tip";
import { getSettingsData } from "@/lib/crm";
import { InviteMemberForm } from "@/components/invite-member-form";
import { TestEmailForm } from "@/components/test-email-form";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type SettingsWorkspaceTab = "team" | "invites" | "directory" | "manage";

function normalizeTab(value: string | undefined, canManage: boolean): SettingsWorkspaceTab {
  if (value === "invites" && canManage) return value;
  if (value === "directory") return value;
  if (value === "manage" && canManage) return value;
  return "team";
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getSettingsData();
  const canManage = data.session.role !== "MEMBER";
  const activeTab = normalizeTab(firstValue(resolvedSearchParams.tab), canManage);
  const pendingInvites = data.invitations.length;

  function buildTabHref(tab: SettingsWorkspaceTab) {
    if (tab === "directory") return "/settings/directory";
    if (tab === "invites") return "/settings/invites";
    if (tab === "manage") return "/settings/manage";
    return "/settings";
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Team</div>
            <h2>Team index</h2>
            <div className="deal-meta">
              Use Team for members, Directory for all users, Invites for pending access, and Settings for workspace setup.
            </div>
          </div>
          <div className="chip-row">
            <span className="chip">{data.members.length} team members</span>
            <span className="chip">{pendingInvites} pending invites</span>
            <span className="chip">{data.emailProvider.toUpperCase()}</span>
            <span className="chip">{data.emailConfiguration.ready ? "Ready" : "Needs fix"}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header workspace-header">
          <div>
            <div className="eyebrow">Views</div>
            <h2>Team tabs</h2>
          </div>
          <div className="workspace-tabs" role="tablist" aria-label="Team workspace tabs">
            <Link
              href={buildTabHref("team")}
              className={`workspace-tab${activeTab === "team" ? " is-active" : ""}`}
              aria-current={activeTab === "team" ? "page" : undefined}
            >
              <span>Team</span>
              <span className="workspace-tab-count">{data.members.length}</span>
            </Link>
            <Link
              href={buildTabHref("directory")}
              className={`workspace-tab${activeTab === "directory" ? " is-active" : ""}`}
              aria-current={activeTab === "directory" ? "page" : undefined}
            >
              <span>Directory</span>
              <span className="workspace-tab-count">{data.allUsers.length}</span>
            </Link>
            {canManage ? (
              <>
                <Link
                  href={buildTabHref("invites")}
                  className={`workspace-tab${activeTab === "invites" ? " is-active" : ""}`}
                  aria-current={activeTab === "invites" ? "page" : undefined}
                >
                  <span>Invites</span>
                  <span className="workspace-tab-count">{pendingInvites}</span>
                </Link>
                <Link
                  href={buildTabHref("manage")}
                  className={`workspace-tab${activeTab === "manage" ? " is-active" : ""}`}
                  aria-current={activeTab === "manage" ? "page" : undefined}
                >
                  <span>Settings</span>
                  <span className="workspace-tab-count">Tools</span>
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {activeTab === "team" ? (
          <div className="stack">
            <div className="deal-meta">Team table for members and role management. Detail and edit buttons jump to the settings tab.</div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Scope</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{member.user.name}</strong>
                        <div className="deal-meta">{member.isDefault ? "Default workspace member" : "Workspace member"}</div>
                      </div>
                    </td>
                    <td>
                      <div className="deal-meta">{member.user.email}</div>
                    </td>
                    <td>
                      <span className={`badge status-${member.role.toLowerCase()}`} title="Workspace access role">
                        {member.role}
                      </span>
                    </td>
                    <td>
                      <div className="deal-meta">{member.isDefault ? "Default organization" : "Team member organization"}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/settings/manage#member-${member.id}`} className="secondary-button table-action-button">
                          Detail
                        </Link>
                        <Link href={`/settings/manage#edit-member-${member.id}`} className="secondary-button table-action-button">
                          Edit
                        </Link>
                        <details className="table-more">
                          <summary className="secondary-button table-action-button">More</summary>
                          <div className="table-more-menu">
                            <a href={`mailto:${member.user.email}`}>Email</a>
                            <Link href={`/settings/directory#user-${member.user.id}`}>Directory entry</Link>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.members.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">No team members found or access is limited.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "directory" ? (
          <div className="stack">
            <div className="deal-meta">Registered users across the workspace. Use email links to reach people directly.</div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.allUsers.map((user) => (
                  <tr key={user.id} id={`user-${user.id}`}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{user.name}</strong>
                        <div className="deal-meta">Registered account</div>
                      </div>
                    </td>
                    <td>
                      <div className="deal-meta">{user.email}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <a href={`mailto:${user.email}`} className="secondary-button table-action-button">
                          Detail
                        </a>
                        <details className="table-more">
                          <summary className="secondary-button table-action-button">More</summary>
                          <div className="table-more-menu">
                            <a href={`mailto:${user.email}`}>Email</a>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.allUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">Directory hidden for this role.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "invites" && canManage ? (
          <div className="stack">
            <div className="deal-meta">Pending invitation queue with revoke controls and direct contact links.</div>
            <table className="popular-items-table">
              <thead>
                <tr>
                  <th>Invite</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.invitations.map((invitation) => (
                  <tr key={invitation.id} id={`invite-${invitation.id}`}>
                    <td>
                      <div className="table-main-cell">
                        <strong>{invitation.name ?? invitation.email}</strong>
                        <div className="deal-meta">Pending invitation</div>
                      </div>
                    </td>
                    <td>
                      <div className="deal-meta">{invitation.email}</div>
                    </td>
                    <td>
                      <span className={`badge status-${invitation.role.toLowerCase()}`} title="Role that will apply when accepted">
                        {invitation.role}
                      </span>
                    </td>
                    <td>
                      <div className="deal-meta">{new Date(invitation.expiresAt).toLocaleString()}</div>
                    </td>
                    <td>
                      <div className="table-action-group">
                        <Link href={`/settings/manage#invite-${invitation.id}`} className="secondary-button table-action-button">
                          Detail
                        </Link>
                        <form action={revokeInvitationAction}>
                          <input type="hidden" name="invitationId" value={invitation.id} />
                          <button type="submit" className="danger-button table-action-button">
                            Revoke
                          </button>
                        </form>
                        <details className="table-more">
                          <summary className="secondary-button table-action-button">More</summary>
                          <div className="table-more-menu">
                            <a href={`mailto:${invitation.email}`}>Email</a>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.invitations.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">No pending invitations.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "manage" && canManage ? (
          <div className="stack">
            <section className="panel" id="organization">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Organization</div>
                  <h2>{data.organization?.name ?? "Workspace settings"}</h2>
                </div>
              </div>
              <div className="stack">
                <div className="row-card">
                  <strong>Slug</strong>
                  <div className="deal-meta">{data.organization?.slug}</div>
                </div>
                <div className="row-card">
                  <strong>Industry</strong>
                  <div className="deal-meta">{data.organization?.industry ?? "Not set"}</div>
                </div>
                <div className="row-card">
                  <strong>Time zone</strong>
                  <div className="deal-meta">{data.organization?.timeZone}</div>
                </div>
                {data.organization ? (
                  <details className="edit-block">
                    <summary>Edit organization</summary>
                    <form action={updateOrganizationAction} className="stack compact-form">
                      <label className="field">
                        <span>Name</span>
                        <input name="name" className="input" defaultValue={data.organization.name} required />
                      </label>
                      <label className="field">
                        <span>Slug</span>
                        <input name="slug" className="input" defaultValue={data.organization.slug} required />
                      </label>
                      <label className="field">
                        <span>Industry</span>
                        <input name="industry" className="input" defaultValue={data.organization.industry ?? ""} />
                      </label>
                      <label className="field">
                        <span>Time zone</span>
                        <input name="timeZone" className="input" defaultValue={data.organization.timeZone} />
                      </label>
                      <button type="submit" className="secondary-button">
                        Save organization
                      </button>
                    </form>
                  </details>
                ) : null}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Create organization</div>
                  <h2>New tenant</h2>
                </div>
              </div>
              <form action={createOrganizationAction} className="stack">
                <label className="field">
                  <span>Name</span>
                  <input name="name" className="input" required placeholder="Northstar Journals" />
                </label>
                <label className="field">
                  <span>Slug</span>
                  <input name="slug" className="input" required placeholder="northstar-journals" />
                </label>
                <label className="field">
                  <span>Industry</span>
                  <input name="industry" className="input" placeholder="Publishing" />
                </label>
                <label className="field">
                  <span>Time zone</span>
                  <input name="timeZone" className="input" defaultValue="Asia/Kolkata" />
                </label>
                <button type="submit" className="primary-button full">
                  Create organization
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Email delivery</div>
                  <h2>Send a test message</h2>
                </div>
              </div>
              <div className="stack">
                <div className="row-card">
                  <strong>Configured provider</strong>
                  <div className="deal-meta">{data.emailProvider.toUpperCase()}</div>
                </div>
                <div className="row-card">
                  <strong>Delivery readiness</strong>
                  <div className="deal-meta">{data.emailConfiguration.ready ? "Ready" : "Action required"}</div>
                </div>
                <div className="deal-meta">
                  Use this form to send a real test email with the current provider. The message will be logged in CRM2
                  so you can confirm delivery history from the workspace.
                </div>
                <TestEmailForm
                  defaultRecipientEmail={data.session.email}
                  currentProvider={data.emailProvider}
                  emailReady={data.emailConfiguration.ready}
                  configurationMessage={data.emailConfiguration.message}
                />
              </div>
            </section>

            <section className="panel" id="invite-member">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Invite team</div>
                  <h2>Send team invite</h2>
                </div>
              </div>
              <InviteMemberForm />
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Team</div>
                  <h2>Team access</h2>
                </div>
              </div>
              <div className="stack">
                {data.members.map((member) => (
                  <article key={member.id} className="row-card" id={`member-${member.id}`}>
                    <div className="row-card-top">
                      <div>
                        <strong>{member.user.name}</strong>
                        <div className="deal-meta">{member.user.email}</div>
                      </div>
                      <span className={`badge status-${member.role.toLowerCase()}`} title="Workspace access role">
                        {member.role}
                      </span>
                    </div>
                    <div className="deal-meta">{member.isDefault ? "Default organization" : "Team member organization"}</div>
                    <div className="inline-actions" id={`edit-member-${member.id}`}>
                      <form action={updateMemberRoleAction} className="inline-form">
                        <input type="hidden" name="membershipId" value={member.id} />
                        <label className="field">
                          <span>
                            Role <HelpTip label="Choose the workspace access level for this teammate." />
                          </span>
                          <select name="role" className="select select-compact" defaultValue={member.role}>
                            <option value="">Choose role</option>
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                          </select>
                        </label>
                        <button type="submit" className="secondary-button">
                          Update role
                        </button>
                      </form>
                      <form action={removeMemberAction}>
                        <input type="hidden" name="membershipId" value={member.id} />
                        <button type="submit" className="danger-button">
                          Remove
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
                {data.members.length === 0 ? <div className="empty-state">No team members found or access is limited.</div> : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

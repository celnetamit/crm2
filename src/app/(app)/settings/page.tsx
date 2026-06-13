import {
  createOrganizationAction,
  removeMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
  updateOrganizationAction,
} from "@/app/actions";
import { getSettingsData } from "@/lib/crm";
import { InviteMemberForm } from "@/components/invite-member-form";
import { TestEmailForm } from "@/components/test-email-form";

export default async function SettingsPage() {
  const data = await getSettingsData();
  const canManage = data.session.role !== "MEMBER";
  const pendingInvites = data.invitations.length;

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Settings</div>
            <h2>Workspace controls and delivery setup.</h2>
            <p>
              Manage the tenant, team access, and email delivery from the same soft mint workspace used across the app.
            </p>
          </div>

          <div className="hero-actions">
            <div className="chip">{data.members.length} members</div>
            <div className="chip">{pendingInvites} pending invites</div>
            <div className="chip">{data.emailProvider.toUpperCase()}</div>
          </div>

          <div className="metric-strip">
            <article className="metric-card">
              <div className="eyebrow">Members</div>
              <div className="metric-value">{data.members.length}</div>
              <div className="deal-meta">Workspace teammates</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Invites</div>
              <div className="metric-value">{pendingInvites}</div>
              <div className="deal-meta">Waiting to join</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Provider</div>
              <div className="metric-value">{data.emailProvider.toUpperCase()}</div>
              <div className="deal-meta">Email backend</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Readiness</div>
              <div className="metric-value">{data.emailConfiguration.ready ? "Ready" : "Fix"}</div>
              <div className="deal-meta">Delivery status</div>
            </article>
          </div>
        </div>

        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">{data.session.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-copy">
                <h3>{data.organization?.name ?? "Workspace"}</h3>
                <span>Admin center</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Email readiness</div>
              <div className="profile-track">
                <span style={{ width: data.emailConfiguration.ready ? "82%" : "42%" }} />
              </div>
              <div className="deal-meta">{data.emailConfiguration.message}</div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{data.allUsers.length}</strong>
                <span>Users</span>
              </div>
              <div className="profile-stat">
                <strong>{data.members.length}</strong>
                <span>Members</span>
              </div>
              <div className="profile-stat">
                <strong>{pendingInvites}</strong>
                <span>Invites</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel">
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
          {canManage && data.organization ? (
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

      {canManage ? (
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
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Members</div>
            <h2>Team access</h2>
          </div>
        </div>
        <div className="stack">
          {data.members.length === 0 ? <div className="empty-state">No members found or access is limited.</div> : null}
          {data.members.map((member) => (
            <article key={member.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{member.user.name}</strong>
                  <div className="deal-meta">{member.user.email}</div>
                </div>
                <span className={`badge status-${member.role.toLowerCase()}`}>{member.role}</span>
              </div>
              <div className="deal-meta">{member.isDefault ? "Default organization" : "Member organization"}</div>
              {canManage ? (
                <div className="inline-actions">
                  <form action={updateMemberRoleAction} className="inline-form">
                    <input type="hidden" name="membershipId" value={member.id} />
                    <select name="role" className="select select-compact" defaultValue={member.role}>
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
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
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {canManage ? (
        <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Invite member</div>
            <h2>Send onboarding invite</h2>
          </div>
        </div>
        <InviteMemberForm />
      </section>
      ) : null}

      {canManage ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Pending invites</div>
              <h2>Invitation queue</h2>
            </div>
          </div>
          <div className="stack">
            {data.invitations.length === 0 ? <div className="empty-state">No pending invitations.</div> : null}
            {data.invitations.map((invitation) => (
              <article key={invitation.id} className="row-card">
                <div className="row-card-top">
                  <div>
                    <strong>{invitation.name ?? invitation.email}</strong>
                    <div className="deal-meta">{invitation.email}</div>
                  </div>
                  <span className={`badge status-${invitation.role.toLowerCase()}`}>{invitation.role}</span>
                </div>
                <div className="deal-meta">Expires {new Date(invitation.expiresAt).toLocaleString()}</div>
                <form action={revokeInvitationAction}>
                  <input type="hidden" name="invitationId" value={invitation.id} />
                  <button type="submit" className="danger-button">
                    Revoke invite
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Directory</div>
            <h2>Registered users</h2>
          </div>
        </div>
        <div className="stack">
          {data.allUsers.length === 0 ? <div className="empty-state">Directory hidden for this role.</div> : null}
          {data.allUsers.map((user) => (
            <article key={user.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{user.name}</strong>
                  <div className="deal-meta">{user.email}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

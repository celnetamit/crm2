import {
  createAutomationRuleAction,
  deleteAutomationRuleAction,
  markNotificationReadAction,
  runAutomationSweepAction,
  updateAutomationRuleAction,
} from "@/app/actions";
import { getAutomationData, getShellData } from "@/lib/crm";

const roleOptions = ["OWNER", "ADMIN", "MEMBER"] as const;

function splitValues(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function describeRecipients(
  recipientRoles: string | null,
  recipientUsers: string | null,
  includeAccountOwners: boolean,
  members: Array<{ role: string; user: { id: string; name: string; email: string } }>,
) {
  const roles = splitValues(recipientRoles);
  const rawUserIds = splitValues(recipientUsers);
  const userIds = new Set(rawUserIds);
  const userLabels = members
    .filter((member) => userIds.has(member.user.id))
    .map((member) => `${member.user.name} (${member.role})`);
  const unresolvedUserIds = rawUserIds.filter((userId) => !members.some((member) => member.user.id === userId));

  const parts = [
    roles.length > 0 ? `Roles: ${roles.join(", ")}` : null,
    userLabels.length > 0 ? `Specific users: ${userLabels.join(", ")}` : null,
    unresolvedUserIds.length > 0 ? `Specific user IDs: ${unresolvedUserIds.join(", ")}` : null,
    includeAccountOwners ? "Includes assigned account owner plus linked deal and task owners" : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Default recipients: OWNER, ADMIN";
}

function RecipientChecklist({
  members,
  selectedRoles,
  selectedUsers,
}: {
  members: Array<{ role: string; user: { id: string; name: string; email: string } }>;
  selectedRoles: string[];
  selectedUsers: string[];
}) {
  const selectedRoleSet = new Set(selectedRoles);
  const selectedUserSet = new Set(selectedUsers);

  return (
    <div className="stack compact-stack">
      <div className="field">
        <span>Recipient roles</span>
        <div className="chip-row">
          {roleOptions.map((role) => (
            <label key={role} className="chip checkbox-field">
              <input type="checkbox" name="recipientRoles" value={role} defaultChecked={selectedRoleSet.has(role)} />
              <span>{role}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Specific users</span>
        <div className="stack compact-stack">
          {members.map((member) => (
            <label key={member.user.id} className="activity-line">
              <span>
                <input
                  type="checkbox"
                  name="recipientUsers"
                  value={member.user.id}
                  defaultChecked={selectedUserSet.has(member.user.id)}
                />{" "}
                {member.user.name} · {member.role}
              </span>
              <span className="deal-meta">{member.user.email}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function AutomationPage() {
  const [{ session }, [rules, notifications, emailLogs, auditEvents, members]] = await Promise.all([
    getShellData(),
    getAutomationData(),
  ]);
  const canManage = session.role !== "MEMBER";
  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Automation</div>
            <h2>Rules and delivery log in one control room.</h2>
            <p>
              Monitor triggers, review notifications, and keep the operational audit trail in a calmer mint workspace.
            </p>
          </div>

          <div className="hero-actions">
            {canManage ? (
              <form action={runAutomationSweepAction}>
                <button type="submit" className="primary-button">
                  Run sweep
                </button>
              </form>
            ) : null}
            <div className="chip">{rules.length} active rules</div>
            <div className="chip">{unreadNotifications} unread notifications</div>
            <div className="chip">{emailLogs.length} recent deliveries</div>
          </div>

          <div className="metric-strip">
            <article className="metric-card">
              <div className="eyebrow">Rules</div>
              <div className="metric-value">{rules.length}</div>
              <div className="deal-meta">Automation definitions</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Unread</div>
              <div className="metric-value">{unreadNotifications}</div>
              <div className="deal-meta">Need review</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Emails</div>
              <div className="metric-value">{emailLogs.length}</div>
              <div className="deal-meta">Delivery history</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Team</div>
              <div className="metric-value">{members.length}</div>
              <div className="deal-meta">Recipients available</div>
            </article>
          </div>
        </div>

        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">{session.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-copy">
                <h3>{session.organizationName}</h3>
                <span>Automation readiness</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Audit events</div>
              <div className="profile-track">
                <span style={{ width: "72%" }} />
              </div>
              <div className="deal-meta">{auditEvents.length} recent events tracked across the workspace.</div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{notifications.length}</strong>
                <span>Notifications</span>
              </div>
              <div className="profile-stat">
                <strong>{emailLogs.length}</strong>
                <span>Delivery logs</span>
              </div>
              <div className="profile-stat">
                <strong>{rules.filter((rule) => rule.active).length}</strong>
                <span>Live rules</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Automation</div>
            <h2>Rules and delivery log</h2>
          </div>
          {canManage ? (
            <form action={runAutomationSweepAction}>
              <button type="submit" className="primary-button">
                Run sweep
              </button>
            </form>
          ) : null}
        </div>

        <div className="stack">
          {rules.map((rule) => (
            <article key={rule.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{rule.name}</strong>
                  <div className="deal-meta">
                    {rule.trigger} · {rule.channel} · delay {rule.delayDays} day(s)
                  </div>
                </div>
                <span className={`badge status-${rule.active ? "sent" : "draft"}`}>{rule.active ? "ACTIVE" : "OFF"}</span>
              </div>
              {rule.triggerValue ? <div className="deal-meta">Trigger value: {rule.triggerValue}</div> : null}
              <div className="deal-meta">
                Recipients: {describeRecipients(rule.recipientRoles, rule.recipientUsers, rule.includeAccountOwners, members)}
              </div>
              <div className="deal-meta">{rule.subjectTemplate}</div>
              <div className="deal-meta">{rule.bodyTemplate}</div>
              {canManage ? (
                <details className="edit-block">
                  <summary>Edit rule</summary>
                  <form action={updateAutomationRuleAction} className="stack compact-form">
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <label className="field">
                      <span>Name</span>
                      <input name="name" className="input" defaultValue={rule.name} required />
                    </label>
                    <label className="field">
                      <span>Trigger</span>
                      <select name="trigger" className="select" defaultValue={rule.trigger}>
                        <option value="TASK_DUE">Task due</option>
                        <option value="DEAL_STAGE_CHANGED">Deal stage changed</option>
                        <option value="INVOICE_OVERDUE">Invoice overdue</option>
                        <option value="ACCOUNT_LIFECYCLE_CHANGED">Account lifecycle changed</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Channel</span>
                      <select name="channel" className="select" defaultValue={rule.channel}>
                        <option value="EMAIL">Email</option>
                        <option value="IN_APP">In-app</option>
                      </select>
                    </label>
                    <label className="field checkbox-field">
                      <input type="checkbox" name="active" defaultChecked={rule.active} />
                      <span>Active</span>
                    </label>
                    <label className="field">
                      <span>Delay days</span>
                      <input name="delayDays" type="number" min="0" step="1" className="input" defaultValue={rule.delayDays} />
                    </label>
                    <label className="field">
                      <span>Trigger value</span>
                      <input
                        name="triggerValue"
                        className="input"
                        defaultValue={rule.triggerValue ?? ""}
                        placeholder="Optional stage, e.g. Churn Risk"
                      />
                    </label>
                    <RecipientChecklist
                      members={members}
                      selectedRoles={splitValues(rule.recipientRoles ?? "OWNER,ADMIN")}
                      selectedUsers={splitValues(rule.recipientUsers)}
                    />
                    <label className="field checkbox-field">
                      <input type="checkbox" name="includeAccountOwners" defaultChecked={rule.includeAccountOwners} />
                      <span>Include assigned account owner, deal owners, and task assignees</span>
                    </label>
                    <label className="field">
                      <span>Subject template</span>
                      <input name="subjectTemplate" className="input" defaultValue={rule.subjectTemplate} required />
                    </label>
                    <label className="field">
                      <span>Body template</span>
                      <textarea name="bodyTemplate" className="textarea" rows={4} defaultValue={rule.bodyTemplate} required />
                    </label>
                    <div className="inline-actions">
                      <button type="submit" className="secondary-button">
                        Save rule
                      </button>
                    </div>
                  </form>
                  <form action={deleteAutomationRuleAction} className="inline-actions danger-row">
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className="danger-button">
                      Delete rule
                    </button>
                  </form>
                </details>
              ) : null}
            </article>
          ))}
          {rules.length === 0 ? <div className="empty-state">No automation rules yet.</div> : null}
        </div>
      </section>

      {canManage ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Create rule</div>
              <h2>New automation</h2>
            </div>
          </div>

          <form action={createAutomationRuleAction} className="stack">
            <label className="field">
              <span>Name</span>
              <input name="name" className="input" required placeholder="Overdue task reminder" />
            </label>

            <label className="field">
              <span>Trigger</span>
              <select name="trigger" className="select" defaultValue="TASK_DUE">
                <option value="TASK_DUE">Task due</option>
                <option value="DEAL_STAGE_CHANGED">Deal stage changed</option>
                <option value="INVOICE_OVERDUE">Invoice overdue</option>
                <option value="ACCOUNT_LIFECYCLE_CHANGED">Account lifecycle changed</option>
              </select>
            </label>

            <label className="field">
              <span>Channel</span>
              <select name="channel" className="select" defaultValue="EMAIL">
                <option value="EMAIL">Email</option>
                <option value="IN_APP">In-app</option>
              </select>
            </label>

            <label className="field">
              <span>Delay days</span>
              <input name="delayDays" type="number" min="0" step="1" className="input" defaultValue={0} />
            </label>

            <label className="field">
              <span>Trigger value</span>
              <input
                name="triggerValue"
                className="input"
                placeholder="Optional stage, e.g. Churn Risk"
              />
            </label>
            <RecipientChecklist members={members} selectedRoles={["OWNER", "ADMIN"]} selectedUsers={[]} />

            <label className="field checkbox-field">
              <input type="checkbox" name="includeAccountOwners" />
              <span>Include assigned account owner, deal owners, and task assignees</span>
            </label>

            <label className="field">
              <span>Subject template</span>
              <input name="subjectTemplate" className="input" required placeholder="Reminder: {{taskTitle}}" />
            </label>

            <label className="field">
              <span>Body template</span>
              <textarea
                name="bodyTemplate"
                className="textarea"
                rows={4}
                required
                placeholder="A task for {{accountName}} is due today."
              />
            </label>

            <button type="submit" className="primary-button full">
              Save rule
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Notifications</div>
            <h2>Team alerts</h2>
          </div>
        </div>

        <div className="stack">
          {notifications.map((notification) => (
            <article key={notification.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{notification.title}</strong>
                  <div className="deal-meta">{notification.type}</div>
                </div>
                <span className={`badge status-${notification.readAt ? "sent" : "draft"}`}>
                  {notification.readAt ? "READ" : "UNREAD"}
                </span>
              </div>
              <div className="deal-meta">{notification.message}</div>
              {!notification.readAt ? (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <button type="submit" className="secondary-button">
                    Mark read
                  </button>
                </form>
              ) : null}
            </article>
          ))}
          {notifications.length === 0 ? <div className="empty-state">No notifications yet.</div> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Email log</div>
            <h2>Delivery history</h2>
          </div>
        </div>

        <div className="stack">
          {emailLogs.map((log) => (
            <article key={log.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{log.subject}</strong>
                  <div className="deal-meta">{log.recipientEmail}</div>
                </div>
                <span className={`badge status-${log.status.toLowerCase()}`}>{log.status}</span>
              </div>
              <div className="deal-meta">{log.provider} · {new Date(log.createdAt).toLocaleString()}</div>
              <div className="deal-meta">{log.body}</div>
            </article>
          ))}
          {emailLogs.length === 0 ? <div className="empty-state">No emails sent yet.</div> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Audit trail</div>
            <h2>Event history</h2>
          </div>
        </div>

        <div className="stack">
          {auditEvents.map((event) => (
            <article key={event.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{event.action}</strong>
                  <div className="deal-meta">{event.entityType} · {event.entityId ?? "n/a"}</div>
                </div>
                <div className="deal-meta">{new Date(event.createdAt).toLocaleString()}</div>
              </div>
              <div className="deal-meta">{event.details ?? "No details"}</div>
            </article>
          ))}
          {auditEvents.length === 0 ? <div className="empty-state">No audit events yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

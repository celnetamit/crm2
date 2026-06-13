import { completeTaskAction, createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/actions";
import { getDealsData, getTasksData, getShellData } from "@/lib/crm";

export default async function TasksPage() {
  const [{ session }, tasks, dealData] = await Promise.all([getShellData(), getTasksData(), getDealsData()]);
  const canManage = session.role !== "MEMBER";
  const openTasks = tasks.filter((task) => task.status === "PENDING").length;
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;

  return (
    <div className="page-grid">
      <section className="hero-panel dashboard-hero">
        <div className="hero-body">
          <div className="hero-copy">
            <div className="eyebrow">Follow-ups</div>
            <h2>Task queue with a lighter planning surface.</h2>
            <p>
              Keep follow-ups visible, sort by status, and update work without the heavy visual treatment.
            </p>
          </div>

          <div className="hero-actions">
            <div className="chip">{tasks.length} total tasks</div>
            <div className="chip">{openTasks} open</div>
            <div className="chip">{completedTasks} completed</div>
          </div>

          <div className="metric-strip">
            <article className="metric-card">
              <div className="eyebrow">Total</div>
              <div className="metric-value">{tasks.length}</div>
              <div className="deal-meta">Scheduled follow-ups</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Open</div>
              <div className="metric-value">{openTasks}</div>
              <div className="deal-meta">Need attention</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Done</div>
              <div className="metric-value">{completedTasks}</div>
              <div className="deal-meta">Completed actions</div>
            </article>
            <article className="metric-card">
              <div className="eyebrow">Owners</div>
              <div className="metric-value">{dealData.users.length}</div>
              <div className="deal-meta">Assignable teammates</div>
            </article>
          </div>
        </div>

        <aside className="hero-rail">
          <article className="profile-panel">
            <div className="profile-head">
              <div className="profile-avatar">{session.name.slice(0, 1).toUpperCase()}</div>
              <div className="profile-copy">
                <h3>{session.organizationName}</h3>
                <span>Task planning</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="deal-meta">Queue health</div>
              <div className="profile-track">
                <span style={{ width: "59%" }} />
              </div>
              <div className="deal-meta">{dealData.accounts.length} accounts can feed the follow-up queue.</div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <strong>{dealData.accounts.length}</strong>
                <span>Accounts</span>
              </div>
              <div className="profile-stat">
                <strong>{dealData.contacts.length}</strong>
                <span>Contacts</span>
              </div>
              <div className="profile-stat">
                <strong>{dealData.deals.length}</strong>
                <span>Deals</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Follow-ups</div>
            <h2>Task queue</h2>
          </div>
        </div>

        <div className="stack">
          {tasks.map((task) => (
            <article key={task.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{task.title}</strong>
                  <div className="deal-meta">
                    {task.account?.name ?? "No account"} · {task.assignedTo.name}
                  </div>
                </div>
                <span className={`badge status-${task.status.toLowerCase()}`}>{task.status}</span>
              </div>
              <div className="deal-meta">{task.notes ?? "No notes"}</div>
              <div className="deal-meta">
                Due {new Date(task.dueAt).toLocaleString()} · {task.contact?.name ?? "No contact"}
              </div>
              <form action={completeTaskAction} className="inline-form">
                <input type="hidden" name="taskId" value={task.id} />
                <input name="notes" className="input input-compact" placeholder="Completion notes" />
                <button type="submit" className="primary-button">
                  Complete
                </button>
              </form>
              {canManage ? (
                <details className="edit-block">
                  <summary>Edit task</summary>
                  <form action={updateTaskAction} className="stack compact-form">
                    <input type="hidden" name="taskId" value={task.id} />
                    <label className="field">
                      <span>Account</span>
                      <select name="accountId" className="select" defaultValue={task.accountId ?? ""}>
                        <option value="">Optional account</option>
                        {dealData.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Contact</span>
                      <select name="contactId" className="select" defaultValue={task.contactId ?? ""}>
                        <option value="">Optional contact</option>
                        {dealData.contacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Deal</span>
                      <select name="dealId" className="select" defaultValue={task.dealId ?? ""}>
                        <option value="">Optional deal</option>
                        {dealData.deals.map((deal) => (
                          <option key={deal.id} value={deal.id}>
                            {deal.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Assign to</span>
                      <select name="assignedToId" className="select" defaultValue={task.assignedToId} required>
                        {dealData.users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} · {user.role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Title</span>
                      <input name="title" className="input" defaultValue={task.title} required />
                    </label>
                    <label className="field">
                      <span>Due at</span>
                      <input
                        name="dueAt"
                        type="datetime-local"
                        className="input"
                        defaultValue={new Date(task.dueAt).toISOString().slice(0, 16)}
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select name="status" className="select" defaultValue={task.status}>
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Notes</span>
                      <textarea name="notes" className="textarea" rows={4} defaultValue={task.notes ?? ""} />
                    </label>
                    <div className="inline-actions">
                      <button type="submit" className="secondary-button">
                        Save task
                      </button>
                    </div>
                  </form>
                  <form action={deleteTaskAction} className="inline-actions danger-row">
                    <input type="hidden" name="taskId" value={task.id} />
                    <button type="submit" className="danger-button">
                      Delete task
                    </button>
                  </form>
                </details>
              ) : null}
            </article>
          ))}
          {tasks.length === 0 ? <div className="empty-state">No tasks created yet.</div> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Schedule follow-up</div>
            <h2>New task</h2>
          </div>
        </div>

        <form action={createTaskAction} className="stack">
          <label className="field">
            <span>Account</span>
            <select name="accountId" className="select" defaultValue="">
              <option value="">Optional account</option>
              {dealData.accounts.map((account) => (
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
              {dealData.contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Deal</span>
            <select name="dealId" className="select" defaultValue="">
              <option value="">Optional deal</option>
              {dealData.deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Assign to</span>
            <select name="assignedToId" className="select" required defaultValue="">
              <option value="" disabled>
                Choose member
              </option>
              {dealData.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.role}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Title</span>
            <input name="title" className="input" required placeholder="Call for renewal discussion" />
          </label>

          <label className="field">
            <span>Due at</span>
            <input name="dueAt" type="datetime-local" className="input" required />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea name="notes" className="textarea" rows={4} placeholder="Agenda, talking points, next steps..." />
          </label>

          <button type="submit" className="primary-button full">
            Save follow-up
          </button>
        </form>
      </section>
    </div>
  );
}

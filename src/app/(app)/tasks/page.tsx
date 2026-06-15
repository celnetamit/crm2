import { completeTaskAction, createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/actions";
import { HelpTip } from "@/components/help-tip";
import { getDealsData, getTasksData, getShellData } from "@/lib/crm";

type TasksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const accountIdFilter = firstValue(resolvedSearchParams.accountId) ?? "";
  const contactIdFilter = firstValue(resolvedSearchParams.contactId) ?? "";
  const dealIdFilter = firstValue(resolvedSearchParams.dealId) ?? "";
  const [{ session }, tasks, dealData] = await Promise.all([getShellData(), getTasksData(), getDealsData()]);
  const canManage = session.role !== "MEMBER";
  const visibleTasks = tasks.filter((task) => {
    if (accountIdFilter && task.accountId !== accountIdFilter) return false;
    if (contactIdFilter && task.contactId !== contactIdFilter) return false;
    if (dealIdFilter && task.dealId !== dealIdFilter) return false;
    return true;
  });
  const openTasks = visibleTasks.filter((task) => task.status === "PENDING").length;
  const completedTasks = visibleTasks.filter((task) => task.status === "COMPLETED").length;
  const activeFilters = [
    accountIdFilter ? "customer" : null,
    contactIdFilter ? "person" : null,
    dealIdFilter ? "deal" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Follow-ups</div>
            <h2>Task index</h2>
            <div className="deal-meta">
              Keep follow-ups visible, filter by customer or deal, and open the list when you need to update work.
            </div>
          </div>
          <div className="chip-row">
            <span className="chip">{visibleTasks.length} tasks</span>
            <span className="chip">{openTasks} open</span>
            <span className="chip">{completedTasks} completed</span>
            <span className="chip">{dealData.users.length} owners</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Follow-ups</div>
            <h2>Task queue</h2>
          </div>
        </div>

        <div className="stack">
          {visibleTasks.length > 0 && activeFilters.length > 0 ? (
            <div className="deal-meta">
              Showing follow-ups for {activeFilters.length === 1 ? `a ${activeFilters[0]}` : activeFilters.join(" and ")}.
            </div>
          ) : null}
          {visibleTasks.map((task) => (
            <article key={task.id} className="row-card">
              <div className="row-card-top">
                <div>
                  <strong>{task.title}</strong>
                  <div className="deal-meta">
                    {task.account?.name ?? "No customer"} · {task.deal?.name ?? "No deal"} · {task.assignedTo.name}
                  </div>
                </div>
                <span className={`badge status-${task.status.toLowerCase()}`}>{task.status}</span>
              </div>
              <div className="deal-meta">{task.notes ?? "No notes"}</div>
              <div className="deal-meta">
                Due {new Date(task.dueAt).toLocaleString()} · {task.contact?.name ?? "No person"}
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
                        <option value="">Optional customer</option>
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
                        <option value="">Optional person</option>
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
                      <span>
                        Status <HelpTip label="Choose the task state: pending, completed, or cancelled." />
                      </span>
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
          {visibleTasks.length === 0 ? <div className="empty-state">No follow-ups match this view yet.</div> : null}
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
            <span>
              Customer <HelpTip label="Attach this follow-up to a customer record." />
            </span>
            <select name="accountId" className="select" defaultValue="">
              <option value="">Optional customer</option>
              {dealData.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>
              Person <HelpTip label="Attach this follow-up to a specific person on the customer record." />
            </span>
            <select name="contactId" className="select" defaultValue="">
              <option value="">Optional person</option>
              {dealData.contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>
              Deal <HelpTip label="Link this follow-up to a deal so it appears in the pipeline context." />
            </span>
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
            <span>
              Assign to <HelpTip label="Pick the teammate who will own and complete this follow-up." />
            </span>
            <select name="assignedToId" className="select" required defaultValue="">
              <option value="" disabled>
                Choose teammate
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

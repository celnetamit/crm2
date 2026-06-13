"use client";

import { useActionState } from "react";
import { sendTestEmailAction } from "@/app/actions";

type TestEmailState = {
  error?: string;
  success?: string;
  provider?: string;
  status?: string;
  recipientEmail?: string;
} | null;

export function TestEmailForm({
  defaultRecipientEmail,
  currentProvider,
  emailReady,
  configurationMessage,
}: {
  defaultRecipientEmail: string;
  currentProvider: string;
  emailReady: boolean;
  configurationMessage: string;
}) {
  const [state, action, pending] = useActionState<TestEmailState, FormData>(sendTestEmailAction, null);

  return (
    <form action={action} className="stack">
      <div className="row-card">
        <strong>Current provider</strong>
        <div className="deal-meta">{currentProvider.toUpperCase()}</div>
      </div>

      <div className={emailReady ? "alert" : "alert error"}>{configurationMessage}</div>

      <label className="field">
        <span>Send test to</span>
        <input
          name="recipientEmail"
          type="email"
          className="input"
          defaultValue={defaultRecipientEmail}
          placeholder="owner@crm2.app"
          required
        />
      </label>

      <label className="field">
        <span>Subject</span>
        <input name="subject" className="input" defaultValue="CRM2 test email" />
      </label>

      <label className="field">
        <span>Message</span>
        <textarea
          name="body"
          className="textarea"
          defaultValue="This is a CRM2 test email from your current provider."
        />
      </label>

      {state?.error ? <div className="alert error">{state.error}</div> : null}
      {state?.success ? <div className="alert">{state.success}</div> : null}
      {state?.status ? <div className="chip">{state.provider?.toUpperCase()} · {state.status}</div> : null}

      <button type="submit" className="primary-button full" disabled={pending || !emailReady}>
        {pending ? "Sending test email..." : "Send test email"}
      </button>
    </form>
  );
}

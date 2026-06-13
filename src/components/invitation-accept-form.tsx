"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/app/actions";

type InvitationAcceptState = {
  error?: string;
  success?: string;
} | null;

export function InvitationAcceptForm({
  token,
  email,
  defaultName,
  existingUser,
}: {
  token: string;
  email: string;
  defaultName?: string | null;
  existingUser: boolean;
}) {
  const [state, action, pending] = useActionState<InvitationAcceptState, FormData>(acceptInvitationAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/");
      router.refresh();
    }
  }, [router, state]);

  return (
    <div className="auth-surface">
      <form action={action} className="stack">
        <input type="hidden" name="token" value={token} />

        <label className="field">
          <span>Email</span>
          <input value={email} className="input" disabled />
        </label>

        <label className="field">
          <span>Name</span>
          <input name="name" className="input" defaultValue={defaultName ?? ""} required={!existingUser} />
        </label>

        <label className="field">
          <span>{existingUser ? "New password (optional)" : "Create password"}</span>
          <input
            name="password"
            type="password"
            className="input"
            placeholder={existingUser ? "Leave blank to keep current password" : "At least 12 characters"}
            required={!existingUser}
          />
        </label>

        {existingUser ? (
          <div className="deal-meta">
            This email already has a CRM2 account. You can join this workspace without changing your password.
          </div>
        ) : null}

        {state?.error ? <div className="alert error">{state.error}</div> : null}
        {state?.success ? <div className="alert">{state.success}</div> : null}

        <button type="submit" className="primary-button full" disabled={pending}>
          {pending ? "Accepting invitation..." : "Accept invitation"}
        </button>
      </form>
    </div>
  );
}

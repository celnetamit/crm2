"use client";

import { useActionState } from "react";
import { inviteMemberAction } from "@/app/actions";

type InviteMemberState = {
  error?: string;
  success?: string;
} | null;

export function InviteMemberForm() {
  const [state, action, pending] = useActionState<InviteMemberState, FormData>(inviteMemberAction, null);

  return (
    <form action={action} className="stack">
      <label className="field">
        <span>Name</span>
        <input name="name" className="input" required placeholder="Nina Patel" />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" className="input" required placeholder="nina@crm2.app" />
      </label>
      <label className="field">
        <span>Role</span>
        <select name="role" className="select" defaultValue="MEMBER">
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
      </label>

      {state?.error ? <div className="alert error">{state.error}</div> : null}
      {state?.success ? <div className="alert">{state.success}</div> : null}

      <button type="submit" className="primary-button full" disabled={pending}>
        {pending ? "Sending invite..." : "Send invite"}
      </button>
    </form>
  );
}

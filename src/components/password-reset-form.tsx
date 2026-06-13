"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions";

type PasswordResetState = {
  error?: string;
  success?: string;
} | null;

export function PasswordResetForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<PasswordResetState, FormData>(resetPasswordAction, null);

  return (
    <div className="auth-surface">
      <form action={action} className="stack">
        <input type="hidden" name="token" value={token} />

        <label className="field">
          <span>Email</span>
          <input value={email} className="input" disabled />
        </label>

        <label className="field">
          <span>New password</span>
          <input name="password" type="password" className="input" required placeholder="At least 12 characters" />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input name="confirmPassword" type="password" className="input" required placeholder="Repeat password" />
        </label>

        {state?.error ? <div className="alert error">{state.error}</div> : null}
        {state?.success ? (
          <div className="stack">
            <div className="alert">{state.success}</div>
            <Link href="/login" className="primary-button full" style={{ textAlign: "center" }}>
              Back to sign in
            </Link>
          </div>
        ) : null}

        {!state?.success ? (
          <button type="submit" className="primary-button full" disabled={pending}>
            {pending ? "Updating password..." : "Update password"}
          </button>
        ) : null}
      </form>
    </div>
  );
}

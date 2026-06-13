"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/actions";

type PasswordResetRequestState = {
  error?: string;
  success?: string;
} | null;

export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState<PasswordResetRequestState, FormData>(requestPasswordResetAction, null);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-copy">
          <h1>Reset your password</h1>
          <p>Enter your email address and we&apos;ll send you a password reset link if your account exists.</p>
        </div>

        <div className="auth-surface">
          <form action={action} className="stack">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" className="input" required placeholder="owner@crm2.app" />
            </label>

            {state?.error ? <div className="alert error">{state.error}</div> : null}
            {state?.success ? <div className="alert">{state.success}</div> : null}

            <button type="submit" className="primary-button full" disabled={pending}>
              {pending ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          <Link href="/login" className="secondary-button full" style={{ textAlign: "center" }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

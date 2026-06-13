"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions";

export default function LoginPage() {
  const showDemoCredentials =
    process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS !== "false");
  const [state, action, pending] = useActionState(loginAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">C2</div>
          <div>
            <div className="brand-name">CRM2</div>
            <div className="brand-subtitle">Multi-tenant sales, billing, and automation</div>
          </div>
        </div>

        <div className="auth-copy">
          <h1>Sign in to your workspace</h1>
          <p>
            Track leads, automate follow-ups, issue proformas, and keep every customer interaction scoped to the right
            organization.
          </p>
        </div>

        <div className="auth-surface">
          <form action={action} className="stack">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" className="input" placeholder="owner@crm2.app" required />
            </label>

            <label className="field">
              <span>Password</span>
              <input name="password" type="password" className="input" placeholder="crm2@123" required />
            </label>

            {state?.error ? <div className="alert error">{state.error}</div> : null}

            <button type="submit" className="primary-button full" disabled={pending}>
              {pending ? "Signing in..." : "Enter CRM2"}
            </button>
          </form>

          <Link href="/forgot-password" className="secondary-button full" style={{ textAlign: "center" }}>
            Forgot password?
          </Link>
        </div>

        {showDemoCredentials ? (
          <div className="auth-demo">
            <div>Demo users</div>
            <code>owner@crm2.app / crm2@123</code>
            <code>ops@crm2.app / crm2@123</code>
          </div>
        ) : null}
      </div>
    </div>
  );
}

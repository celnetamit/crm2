import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { getPasswordResetDetails } from "@/lib/onboarding";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const resolvedParams = await searchParams;
  const token = Array.isArray(resolvedParams.token) ? resolvedParams.token[0] : resolvedParams.token;
  const details = token ? await getPasswordResetDetails(token) : null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-copy">
          <h1>Choose a new password</h1>
          <p>Set a new password for your CRM2 account using this reset link.</p>
        </div>

        {!token || !details ? (
          <div className="stack">
            <div className="alert error">This reset link is invalid, expired, or has already been used.</div>
            <Link href="/forgot-password" className="secondary-button full" style={{ textAlign: "center" }}>
              Request a new link
            </Link>
          </div>
        ) : (
          <PasswordResetForm token={token} email={details.email} />
        )}
      </div>
    </div>
  );
}

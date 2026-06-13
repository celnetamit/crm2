import Link from "next/link";
import { InvitationAcceptForm } from "@/components/invitation-accept-form";
import { getInvitationDetails } from "@/lib/onboarding";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const resolvedParams = await searchParams;
  const token = Array.isArray(resolvedParams.token) ? resolvedParams.token[0] : resolvedParams.token;
  const details = token ? await getInvitationDetails(token) : null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-copy">
          <h1>Accept workspace invite</h1>
          <p>Use this secure link to join your CRM2 workspace.</p>
        </div>

        {!token || !details ? (
          <div className="stack">
            <div className="alert error">This invitation is invalid, expired, or has already been used.</div>
            <Link href="/login" className="secondary-button full" style={{ textAlign: "center" }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="stack">
            <div className="row-card">
              <strong>Organization</strong>
              <div className="deal-meta">{details.organizationName}</div>
            </div>
            <div className="row-card">
              <strong>Role</strong>
              <div className="deal-meta">{details.role}</div>
            </div>
            <InvitationAcceptForm
              token={token}
              email={details.email}
              defaultName={details.name}
              existingUser={details.existingUser}
            />
          </div>
        )}
      </div>
    </div>
  );
}

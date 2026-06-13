# CRM2 Launch Readiness Plan

## Goal

Move CRM2 from a demo-friendly local app to a production-ready launch candidate with safe defaults, clear operator workflows, and repeatable deployment checks.

## Current status

- Completed: local PostgreSQL runtime, Prisma migrations, dev/start auto-start for database, production build health.
- In progress: production config hardening, demo-mode isolation, first-owner bootstrap flow.
- Remaining: deployment pipeline, production email delivery, security review, observability, and pre-launch QA.

## Workstreams

### 1. Production configuration and secrets

- Require `SESSION_SECRET` in production and validate minimum length.
- Separate demo-only behavior from production behavior using explicit env flags.
- Document production env contract for database, email, cookies, and operator setup.

### 2. Authentication and tenant bootstrap

- Remove public demo credentials from production UI.
- Disable automatic demo data seeding in production.
- Provide a supported bootstrap command for the first owner and workspace.
- Add password reset or invite flow for non-demo user onboarding.

### 3. Messaging and billing reliability

- Replace `mock` email in production with SMTP or AWS SES.
- Add delivery failure visibility in the UI and operator docs.
- Validate invoice and automation flows against a real email provider.

### 4. Security and compliance hardening

- Review role boundaries for settings, member management, and workspace data.
- Add CSRF/rate-limit review for auth and sensitive mutations.
- Review data retention and audit coverage for user-management events.

### 5. Deployment and operations

- Add production deployment instructions and environment examples.
- Add health checks, backup expectations, and restore guidance for Postgres.
- Add smoke-test checklist for build, login, dashboard, billing, and automation.

### 6. Launch QA

- Test non-demo tenant creation and owner onboarding.
- Test SMTP/SES delivery, overdue invoice reminders, and audit logs.
- Test mobile and desktop flows for login, accounts, deals, tasks, billing, and settings.

## Implementation sequence

1. Complete production config and bootstrap hardening.
2. Replace demo-only auth and delivery defaults with production-safe flows.
3. Add deployment/ops docs and launch smoke tests.
4. Run final QA pass and fix launch-blocking defects.

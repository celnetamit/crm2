# Coolify Deployment Guide

This guide walks through deploying CRM2 on Coolify with a production database, real environment variables, and the right start command for this repo.

## What Coolify needs from this app

CRM2 is a Next.js app with Prisma and production-only environment checks:

- `APP_URL` must be set to the public URL.
- `SESSION_SECRET` must be at least 32 characters.
- `ALLOW_DEMO_SEEDING` should stay `false` in production.
- `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` should stay `false` in production.
- Email should use a real provider such as SMTP or AWS SES.

The repo also has a local Docker Compose Postgres setup for development. Do not rely on that local Compose file in Coolify.

## Step 1: Prepare the repository

Before creating the app in Coolify, make sure your code is pushed to the Git branch you want to deploy.

If you are deploying from `main`, confirm the branch is up to date.

## Step 2: Create the app in Coolify

1. Open Coolify.
2. Click **New Project** if you do not already have one.
3. Inside the project, click **New Resource**.
4. Choose **Application**.
5. Connect the Git repository for CRM2.
6. Select the branch you want to deploy, usually `main`.

## Step 3: Choose the app type

Use the default Node/Next.js application flow in Coolify.

If Coolify asks for a buildpack or runtime, choose the option that runs a standard Node application.

Do not configure this as a Docker Compose app unless you intentionally want to manage your own full stack. CRM2 only needs the app container plus a database service.

## Step 4: Add PostgreSQL

You need a production PostgreSQL database.

Choose one of these approaches:

1. Use a Coolify PostgreSQL resource.
2. Use an external managed PostgreSQL provider.

If you use Coolify PostgreSQL:

1. Create a PostgreSQL service in the same Coolify project.
2. Keep the database data on a persistent volume.
3. Copy the internal connection string from Coolify into `DATABASE_URL`.

If you use an external provider:

1. Create the database in your provider of choice.
2. Copy the provider connection string into `DATABASE_URL`.
3. Make sure the host allows connections from your Coolify server.

## Step 5: Set environment variables

Add these variables in Coolify using values for your production deployment.

Base variables:

```env
DATABASE_URL="postgresql://crm2:<strong-db-password>@db-host:5432/crm2?schema=public"
APP_URL="https://crm.yourdomain.com"
SESSION_SECRET="replace-with-a-32-character-or-longer-secret"
ALLOW_DEMO_SEEDING="false"
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS="false"
```

Email variables for SMTP:

```env
EMAIL_PROVIDER="smtp"
EMAIL_FROM="CRM2 <notifications@yourdomain.com>"
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
```

If you use AWS SES instead, follow the SMTP setup guide in [docs/SMTP_SETUP.md](/home/itb09/Desktop/projects/crm2/docs/SMTP_SETUP.md) and fill the SES variables instead.

## Step 6: Configure the build command

Use a build command that installs dependencies, generates Prisma client code, and builds the Next.js app.

Recommended build command:

```bash
npm ci && npm run prisma:generate && npm run build
```

If Coolify already installs dependencies for you, you can shorten this to:

```bash
npm run prisma:generate && npm run build
```

## Step 7: Configure the start command

Do not use `npm run start` in Coolify for this repo.

Reason:

- `npm run start` triggers the `prestart` hook.
- In this repo, `prestart` runs `docker compose up -d postgres`.
- Coolify should not try to launch the local development database container inside the app container.

Use a direct Next.js start command instead:

```bash
npx next start -p $PORT
```

If Coolify requires a shell command with the port placeholder in a different format, use the platform’s documented variable syntax but keep the command equivalent to `next start`.

## Step 8: Add migrations

Run Prisma migrations against the production database before the app goes live.

Recommended command:

```bash
npx prisma migrate deploy
```

You can run it in one of these places:

1. As a one-time command before the first deploy.
2. As a post-deploy command in Coolify.
3. As a release hook if your Coolify plan supports it.

## Step 9: First deployment checklist

1. Save all environment variables.
2. Save the build command.
3. Save the start command.
4. Run the first deploy.
5. Watch the build logs for Prisma and Next.js errors.
6. Confirm the app starts and serves the login page.

## Step 10: Bootstrap the first owner

After the app is live and connected to the production database, create the first workspace owner.

Use the bootstrap command with a real production email address and a strong password:

```bash
npm run bootstrap:owner -- --email=owner@example.com --password='strong-password' --name='Owner Name' --org-name='Workspace Name'
```

Run this only once for the initial owner account.

## Step 11: Verify email delivery

Before inviting real users, verify email sending:

```bash
npm run email:check
```

If the check fails, fix the email provider before onboarding users.

## Step 12: Smoke test the app

After deploy, verify the main CRM flows:

1. Sign in as the first owner.
2. Open Customers.
3. Open Follow-ups.
4. Open Deals.
5. Open Billing.
6. Open Team.
7. Open Settings.
8. Create a test record.
9. Edit a test record.
10. Confirm emails, invites, and password flows work.

## Recommended Coolify settings

- **App name:** CRM2
- **Branch:** `main`
- **Port:** let Coolify expose the app port from `next start`
- **Health check:** use the app root URL if no dedicated health endpoint exists
- **Persistent storage:** enable it for PostgreSQL if Coolify hosts the database

## Troubleshooting

### The app fails with `APP_URL is required in production`

Set `APP_URL` to the public HTTPS URL of the Coolify deployment.

### The app fails with `SESSION_SECRET is required in production`

Set a random secret that is at least 32 characters long.

### The app starts but migrations are missing

Run:

```bash
npx prisma migrate deploy
```

Then redeploy.

### Login works but invite or reset links are wrong

`APP_URL` is probably missing or still points to localhost.

### Email checks fail

Review the provider-specific setup in [docs/SMTP_SETUP.md](/home/itb09/Desktop/projects/crm2/docs/SMTP_SETUP.md) and confirm the SMTP credentials are valid.

### Coolify tries to start Docker Compose

This usually means the start command is still `npm run start`. Replace it with:

```bash
npx next start -p $PORT
```

## Minimal production env example

```env
DATABASE_URL="postgresql://crm2:<strong-db-password>@db-host:5432/crm2?schema=public"
APP_URL="https://crm.yourdomain.com"
SESSION_SECRET="replace-with-a-32-character-or-longer-secret"
ALLOW_DEMO_SEEDING="false"
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS="false"
EMAIL_PROVIDER="smtp"
EMAIL_FROM="CRM2 <notifications@yourdomain.com>"
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
```

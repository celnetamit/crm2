This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local Database

This project uses Prisma with a local PostgreSQL database in Docker.

Start the database:

```bash
npm run db:up
```

Both `npm run dev` and `npm run start` will also bring the database up automatically.

Apply the schema and seed sample data:

```bash
npm run db:setup
npm run db:seed
```

The database listens on `127.0.0.1:54321` with:

- user: `crm2`
- password: `crm2-dev`
- database: `crm2`

## Launch Readiness

The current launch plan lives in [docs/LAUNCH_READINESS_PLAN.md](/home/itb09/Desktop/projects/crm2/docs/LAUNCH_READINESS_PLAN.md).

Production hardening now assumes:

- `SESSION_SECRET` must be set in production and should be at least 32 characters.
- `APP_URL` must point to the public base URL so invite and reset emails can generate correct links.
- Demo seeding and demo credential display should be disabled in production with `ALLOW_DEMO_SEEDING=false` and `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false`.
- `EMAIL_PROVIDER=mock` or `console` should only be used for local/demo work. Public launch should use `smtp` or `aws`.
- The first real workspace owner can be created with:

```bash
npm run bootstrap:owner -- --email=owner@example.com --password='strong-password' --name='Owner Name' --org-name='Workspace Name'
```

To verify production email configuration before launch:

```bash
npm run email:check
```

The production SMTP template is in [.env.production.example](/home/itb09/Desktop/projects/crm2/.env.production.example) and the step-by-step setup guide is in [docs/SMTP_SETUP.md](/home/itb09/Desktop/projects/crm2/docs/SMTP_SETUP.md).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

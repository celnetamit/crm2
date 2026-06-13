# SMTP Setup

## Goal

Configure CRM2 to send real production email through an authenticated SMTP provider.

## Required environment variables

Use [.env.production.example](/home/itb09/Desktop/projects/crm2/.env.production.example) as the base and set:

- `EMAIL_PROVIDER=smtp`
- `EMAIL_FROM` to a real sender address on your domain
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

## Recommended baseline

For most hosted SMTP providers:

```env
EMAIL_PROVIDER="smtp"
EMAIL_FROM="CRM2 <notifications@yourdomain.com>"
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
```

Use port `465` with `SMTP_SECURE=true` only if your provider explicitly requires implicit TLS.

## Launch checklist

1. Set all production env vars.
2. Verify `EMAIL_FROM` is a valid sender your provider allows.
3. Run `npm run email:check`.
4. Open Settings in CRM2 and send a test message.
5. Confirm the message arrives and the send is logged in the Email delivery panel.

## Failure patterns

- `Set SMTP_HOST and SMTP_PORT`: relay host/port is missing.
- `Set SMTP_USER and SMTP_PASS`: production relay credentials are missing.
- Authentication failed: provider username/password is wrong.
- TLS or connection timeout: host, port, or firewall/network policy is incorrect.

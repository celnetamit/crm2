import nodemailer from "nodemailer";
import { GetAccountCommand, SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { isProduction } from "@/lib/env";

export type EmailProvider = "mock" | "console" | "smtp" | "aws";
export type EmailDeliveryStatus = "SENT" | "FAILED";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  html?: string;
};

export type SendEmailResult = {
  provider: EmailProvider;
  status: EmailDeliveryStatus;
  sentAt?: Date;
  errorMessage?: string;
  messageId?: string;
};

export type EmailConfigurationStatus = {
  provider: EmailProvider;
  ready: boolean;
  mode: "demo" | "production";
  message: string;
};

function normalizeProvider(value: string | undefined): EmailProvider {
  const provider = (value ?? "mock").trim().toLowerCase();
  if (provider === "console") return "console";
  if (provider === "smtp") return "smtp";
  if (provider === "aws" || provider === "ses") return "aws";
  return "mock";
}

function readFromAddress() {
  return (process.env.EMAIL_FROM ?? "no-reply@crm2.local").trim();
}

function isLikelyLocalAddress(value: string) {
  return !value || value.endsWith(".local") || value.includes("example.com");
}

function readSmtpSecure() {
  const value = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (!value) {
    return String(process.env.SMTP_PORT ?? "587") === "465";
  }

  return value === "1" || value === "true" || value === "yes";
}

function getSmtpTransport() {
  const host = (process.env.SMTP_HOST ?? "").trim();
  const port = Number(process.env.SMTP_PORT ?? "");
  if (!host || Number.isNaN(port)) {
    return {
      error: "Set SMTP_HOST and SMTP_PORT to enable SMTP delivery.",
    };
  }

  const user = (process.env.SMTP_USER ?? "").trim();
  const pass = process.env.SMTP_PASS ?? "";

  if (isProduction() && (!user || !pass)) {
    return {
      error: "Set SMTP_USER and SMTP_PASS to enable authenticated SMTP delivery in production.",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: readSmtpSecure(),
    auth: user || pass ? { user, pass } : undefined,
  });

  return { transporter };
}

function getAwsTransport() {
  const region = (process.env.AWS_REGION ?? "").trim();
  if (!region) {
    return {
      error: "Set AWS_REGION to enable AWS SES delivery.",
    };
  }

  const sesClient = new SESv2Client({ region });
  const transporter = nodemailer.createTransport({
    SES: { sesClient, SendEmailCommand },
  });

  return { transporter };
}

function validateBaseEmailConfig(provider: EmailProvider): string | null {
  const fromAddress = readFromAddress();
  if (!fromAddress) {
    return "Set EMAIL_FROM to a verified sender address.";
  }

  if (isProduction() && isLikelyLocalAddress(fromAddress)) {
    return "EMAIL_FROM must be a real verified sender address in production.";
  }

  if (isProduction() && (provider === "mock" || provider === "console")) {
    return `EMAIL_PROVIDER=${provider} is not allowed for production delivery. Use smtp or aws.`;
  }

  return null;
}

export function getEmailConfigurationStatus(): EmailConfigurationStatus {
  const provider = getConfiguredEmailProvider();
  const mode = isProduction() ? "production" : "demo";

  const baseError = validateBaseEmailConfig(provider);
  if (baseError) {
    return {
      provider,
      ready: false,
      mode,
      message: baseError,
    };
  }

  if (provider === "mock") {
    return {
      provider,
      ready: true,
      mode,
      message: "Mock delivery is enabled for local/demo use only.",
    };
  }

  if (provider === "console") {
    return {
      provider,
      ready: true,
      mode,
      message: "Console delivery logs messages locally and should not be used for public launch.",
    };
  }

  if (provider === "smtp") {
    const host = (process.env.SMTP_HOST ?? "").trim();
    const port = Number(process.env.SMTP_PORT ?? "");
    if (!host || Number.isNaN(port)) {
      return {
        provider,
        ready: false,
        mode,
        message: "Set SMTP_HOST and SMTP_PORT to enable SMTP delivery.",
      };
    }

    return {
      provider,
      ready: true,
      mode,
      message: `SMTP delivery is configured for ${host}:${port}.`,
    };
  }

  const region = (process.env.AWS_REGION ?? "").trim();
  if (!region) {
    return {
      provider,
      ready: false,
      mode,
      message: "Set AWS_REGION to enable AWS SES delivery.",
    };
  }

  return {
    provider,
    ready: true,
    mode,
    message: `AWS SES delivery is configured for region ${region}.`,
  };
}

export async function verifyEmailConfiguration(): Promise<EmailConfigurationStatus> {
  const status = getEmailConfigurationStatus();
  if (!status.ready || status.provider === "mock" || status.provider === "console") {
    return status;
  }

  if (status.provider === "smtp") {
    const smtp = getSmtpTransport();
    if ("error" in smtp) {
      const message = smtp.error ?? "SMTP verification failed.";
      return {
        ...status,
        ready: false,
        message,
      };
    }

    try {
      await smtp.transporter.verify();
      return {
        ...status,
        message: `${status.message} Connection verified successfully.`,
      };
    } catch (error) {
      return {
        ...status,
        ready: false,
        message: error instanceof Error ? error.message : "SMTP verification failed.",
      };
    }
  }

  try {
    const region = (process.env.AWS_REGION ?? "").trim();
    const client = new SESv2Client({ region });
    await client.send(new GetAccountCommand({}));
    return {
      ...status,
      message: `${status.message} AWS SES credentials verified successfully.`,
    };
  } catch (error) {
    return {
      ...status,
      ready: false,
      message: error instanceof Error ? error.message : "AWS SES verification failed.",
    };
  }
}

async function deliverWithTransport(
  provider: EmailProvider,
  transporter: ReturnType<typeof nodemailer.createTransport>,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  try {
    const info = await transporter.sendMail({
      from: readFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: input.html ?? input.body,
    });

    return {
      provider,
      status: "SENT",
      sentAt: new Date(),
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      provider,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Failed to send email.",
    };
  }
}

export function getConfiguredEmailProvider(): EmailProvider {
  return normalizeProvider(process.env.EMAIL_PROVIDER);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = getConfiguredEmailProvider();
  const configStatus = getEmailConfigurationStatus();

  if (!configStatus.ready) {
    return {
      provider,
      status: "FAILED",
      errorMessage: configStatus.message,
    };
  }

  if (provider === "mock") {
    return {
      provider,
      status: "SENT",
      sentAt: new Date(),
    };
  }

  if (provider === "console") {
    console.log("[crm2:email]", {
      from: readFromAddress(),
      to: input.to,
      subject: input.subject,
      body: input.body,
      html: input.html ?? null,
    });

    return {
      provider,
      status: "SENT",
      sentAt: new Date(),
    };
  }

  if (provider === "smtp") {
    const smtp = getSmtpTransport();
    if ("error" in smtp) {
      return {
        provider,
        status: "FAILED",
        errorMessage: smtp.error,
      };
    }

    return deliverWithTransport(provider, smtp.transporter, input);
  }

  const aws = getAwsTransport();
  if ("error" in aws) {
    const message = aws.error ?? "AWS SES verification failed.";
    return {
      provider,
      status: "FAILED",
      errorMessage: message,
    };
  }

  return deliverWithTransport(provider, aws.transporter, input);
}

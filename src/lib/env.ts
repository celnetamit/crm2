function readFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getAppUrl() {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (isProduction()) {
    throw new Error("APP_URL is required in production.");
  }

  return "http://localhost:3000";
}

export function isDemoSeedingEnabled() {
  return readFlag(process.env.ALLOW_DEMO_SEEDING, !isProduction());
}

export function getSessionSecret() {
  const configuredSecret = process.env.SESSION_SECRET?.trim();
  if (configuredSecret) {
    if (isProduction() && configuredSecret.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters in production.");
    }

    return configuredSecret;
  }

  if (isProduction()) {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return "crm2-dev-secret-key-change-me-32bytes";
}

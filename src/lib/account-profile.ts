export function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "Not set";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toDateInputValue(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function parseTags(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function getHealthTone(score?: number | null) {
  if (score === null || score === undefined) return "draft";
  if (score >= 80) return "sent";
  if (score >= 60) return "warning";
  return "overdue";
}

export function getProfileCompleteness(account: {
  industry?: string | null;
  website?: string | null;
  lifecycleStage?: string | null;
  segment?: string | null;
  source?: string | null;
  tags?: string | null;
  profileSummary?: string | null;
  headquarters?: string | null;
  companySize?: string | null;
  annualRevenue?: number | null;
  healthScore?: number | null;
  nextReviewAt?: Date | string | null;
  customFields?: unknown;
  notes?: string | null;
  contacts: Array<{ email?: string | null }>;
}) {
  const checks = [
    account.industry,
    account.website,
    account.lifecycleStage,
    account.segment,
    account.source,
    account.tags,
    account.profileSummary,
    account.headquarters,
    account.companySize,
    account.annualRevenue,
    account.healthScore,
    account.nextReviewAt,
    account.customFields && typeof account.customFields === "object" ? Object.keys(account.customFields as object).length : 0,
    account.notes,
    account.contacts[0]?.email,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

export function customFieldEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [] as Array<[string, string]>;
  return Object.entries(value as Record<string, unknown>).map(([key, raw]) => [key, String(raw)] as [string, string]);
}

export function customFieldsTextareaValue(value: unknown) {
  const entries = customFieldEntries(value);
  return entries.map(([key, entryValue]) => `${key}: ${entryValue}`).join("\n");
}

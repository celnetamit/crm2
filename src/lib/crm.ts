import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getConfiguredEmailProvider, getEmailConfigurationStatus, sendEmail } from "@/lib/email";
import { ensureSeedData } from "@/lib/seed";
import { getSession, setSession, updateSessionOrganization, type SessionPayload } from "@/lib/auth";
import { parseCsv, stringifyCsv } from "@/lib/csv";
import type {
  AutomationChannel,
  AutomationTrigger,
  DealStatus,
  InvoiceKind,
  InvoiceStatus,
  MembershipRole,
} from "@/generated/prisma";

type WorkspaceContext = {
  session: SessionPayload;
  organizationId: string;
};

function canManageMembers(role: MembershipRole) {
  return role === "OWNER" || role === "ADMIN";
}

function canManageRecords(role: MembershipRole) {
  return role === "OWNER" || role === "ADMIN";
}

async function getCurrentMembership(workspace: WorkspaceContext) {
  return prisma.membership.findFirst({
    where: {
      userId: workspace.session.userId,
      organizationId: workspace.organizationId,
    },
    include: { organization: true, user: true },
  });
}

function endOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeCustomFields(input?: string) {
  const trimmed = input?.trim();
  if (!trimmed) return Prisma.JsonNull;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Prisma.InputJsonValue;
    }
  } catch {}

  const entries = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) return null;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!key || !value) return null;
      return [key, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  if (entries.length === 0) return Prisma.JsonNull;
  return Object.fromEntries(entries) as Prisma.InputJsonValue;
}

function maybeDate(input?: string) {
  const trimmed = input?.trim();
  return trimmed ? new Date(trimmed) : null;
}

function maybeNumber(input?: string) {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTagList(input?: string) {
  return Array.from(
    new Set(
      (input ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function mergeTagList(existingTags: string | null | undefined, nextTags: string[], mode: "REPLACE" | "APPEND" | "REMOVE") {
  const currentTags = normalizeTagList(existingTags ?? undefined);
  const incomingTags = normalizeTagList(nextTags.join(","));

  if (mode === "REPLACE") {
    return incomingTags.join(",") || null;
  }

  if (mode === "APPEND") {
    return Array.from(new Set([...currentTags, ...incomingTags])).join(",") || null;
  }

  const remaining = currentTags.filter((tag) => !incomingTags.includes(tag));
  return remaining.join(",") || null;
}

function normalizeRecipientRoles(input?: string) {
  const normalized = input
    ?.split(",")
    .map((role) => role.trim().toUpperCase())
    .filter((role): role is MembershipRole => role === "OWNER" || role === "ADMIN" || role === "MEMBER");

  if (!normalized || normalized.length === 0) {
    return "OWNER,ADMIN";
  }

  return Array.from(new Set(normalized)).join(",");
}

function resolveRecipientRoles(input?: string | null) {
  return normalizeRecipientRoles(input ?? undefined).split(",") as MembershipRole[];
}

function normalizeRecipientUsers(input?: string) {
  const normalized = input
    ?.split(",")
    .map((userId) => userId.trim())
    .filter(Boolean);

  if (!normalized || normalized.length === 0) return null;
  return Array.from(new Set(normalized)).join(",");
}

function resolveRecipientUsers(input?: string | null) {
  return (input ?? "")
    .split(",")
    .map((userId) => userId.trim())
    .filter(Boolean);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function buildMonthlySeries<T>(
  items: T[],
  dateSelector: (item: T) => Date | string | null | undefined,
  valueSelector: (item: T) => number,
  months = 12,
) {
  const now = new Date();
  const buckets = new Map<string, number>();

  for (let index = months - 1; index >= 0; index -= 1) {
    const monthDate = addMonths(startOfMonth(now), -index);
    buckets.set(monthKey(monthDate), 0);
  }

  for (const item of items) {
    const rawDate = dateSelector(item);
    if (!rawDate) continue;
    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = monthKey(startOfMonth(date));
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + valueSelector(item));
  }

  return Array.from(buckets.entries()).map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
    return { label, value };
  });
}

function buildDailySeries<T>(
  items: T[],
  dateSelector: (item: T) => Date | string | null | undefined,
  valueSelector: (item: T) => number,
  days = 7,
) {
  const now = new Date();
  const buckets = new Map<string, number>();

  for (let index = days - 1; index >= 0; index -= 1) {
    const dayDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - index));
    buckets.set(dayDate.toISOString().slice(0, 10), 0);
  }

  for (const item of items) {
    const rawDate = dateSelector(item);
    if (!rawDate) continue;
    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = startOfDay(date).toISOString().slice(0, 10);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + valueSelector(item));
  }

  return Array.from(buckets.entries()).map(([key, value]) => {
    const date = new Date(`${key}T00:00:00.000Z`);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      value,
    };
  });
}

function buildMonthlyAverageSeries<T>(
  items: T[],
  dateSelector: (item: T) => Date | string | null | undefined,
  valueSelector: (item: T) => number | null | undefined,
  months = 12,
) {
  const now = new Date();
  const buckets = new Map<string, { sum: number; count: number }>();

  for (let index = months - 1; index >= 0; index -= 1) {
    const monthDate = addMonths(startOfMonth(now), -index);
    buckets.set(monthKey(monthDate), { sum: 0, count: 0 });
  }

  for (const item of items) {
    const rawDate = dateSelector(item);
    const rawValue = valueSelector(item);
    if (!rawDate || rawValue === null || rawValue === undefined) continue;
    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = monthKey(startOfMonth(date));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.sum += rawValue;
    bucket.count += 1;
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => {
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
    return {
      label,
      value: bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0,
    };
  });
}

function countBy<T>(
  items: T[],
  selector: (item: T) => string | null | undefined,
  limit = 5,
  fallbackLabel = "Unspecified",
) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = (selector(item) ?? fallbackLabel).trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function bucketHealthScore(score: number | null | undefined) {
  if (score === null || score === undefined) return "Unknown";
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Watch";
  return "At Risk";
}

function bucketTaskStatus(status: string) {
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return "Pending";
}

async function createAccountCommentRevision(params: {
  organizationId: string;
  commentId: string;
  authorUserId: string;
  title?: string | null;
  body: string;
  category: string;
  pinned: boolean;
}) {
  const latestRevision = await prisma.accountCommentRevision.findFirst({
    where: { commentId: params.commentId },
    select: { versionNumber: true },
    orderBy: { versionNumber: "desc" },
  });

  return prisma.accountCommentRevision.create({
    data: {
      commentId: params.commentId,
      organizationId: params.organizationId,
      authorUserId: params.authorUserId,
      title: params.title ?? null,
      body: params.body,
      category: params.category,
      pinned: params.pinned,
      versionNumber: (latestRevision?.versionNumber ?? 0) + 1,
    },
  });
}

async function resolveWorkspace(): Promise<WorkspaceContext> {
  await ensureSeedData();
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.userId,
      organizationId: session.organizationId,
    },
    include: { organization: true },
  });

  if (!membership) {
    const fallback = await prisma.membership.findFirst({
      where: { userId: session.userId },
      include: { organization: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (!fallback) redirect("/login");

    const refreshed = await updateSessionOrganization(session.userId, fallback.organizationId);
    if (!refreshed) redirect("/login");

    return {
      session: refreshed,
      organizationId: refreshed.organizationId,
    };
  }

  return {
    session,
    organizationId: session.organizationId,
  };
}

async function resolveWorkspaceWithMembership() {
  const workspace = await resolveWorkspace();
  const membership = await getCurrentMembership(workspace);
  if (!membership) redirect("/login");

  return {
    ...workspace,
    membership,
  };
}

async function resolveWorkspaceWithMemberships() {
  const workspace = await resolveWorkspace();
  const memberships = await prisma.membership.findMany({
    where: { userId: workspace.session.userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
        },
      },
    },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "asc" },
    ],
  });

  return {
    ...workspace,
    memberships,
  };
}

function auditDetails(details: Record<string, unknown>) {
  return JSON.stringify(details);
}

async function logAudit(params: {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.auditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ? auditDetails(params.details) : null,
    },
  });
}

async function queueNotification(params: {
  organizationId: string;
  userId?: string;
  taskId?: string;
  type: string;
  title: string;
  message: string;
}) {
  await prisma.notification.create({
    data: params,
  });
}

async function queueOrganizationNotification(params: {
  organizationId: string;
  type: string;
  title: string;
  message: string;
  roles?: MembershipRole[];
  userIds?: string[];
}) {
  const roleRecipients = await prisma.membership.findMany({
    where: {
      organizationId: params.organizationId,
      role: { in: params.roles && params.roles.length > 0 ? params.roles : ["OWNER", "ADMIN"] },
    },
    select: { userId: true },
  });

  const recipients = Array.from(
    new Set([
      ...roleRecipients.map((recipient) => recipient.userId),
      ...((params.userIds ?? []).filter(Boolean)),
    ]),
  );

  for (const userId of recipients) {
    await queueNotification({
      organizationId: params.organizationId,
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
    });
  }
}

async function queueEmail(params: {
  organizationId: string;
  invoiceId?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const emailLog = await prisma.emailLog.create({
    data: {
      organizationId: params.organizationId,
      invoiceId: params.invoiceId,
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      body: params.body,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      provider: getConfiguredEmailProvider(),
      status: "QUEUED",
      sentAt: null,
    },
  });

  const delivery = await sendEmail({
    to: params.recipientEmail,
    subject: params.subject,
    body: params.body,
  });

  return prisma.emailLog.update({
    where: { id: emailLog.id },
    data: {
      provider: delivery.provider,
      status: delivery.status,
      errorMessage: delivery.errorMessage ?? null,
      sentAt: delivery.sentAt ?? null,
    },
  });
}

function renderTemplate(template: string, values: Record<string, string | number | undefined>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

async function triggerAccountLifecycleAutomation(params: {
  organizationId: string;
  actorUserId: string;
  previousLifecycleStage?: string | null;
  account: {
    id: string;
    name: string;
    lifecycleStage?: string | null;
    status: string;
    segment?: string | null;
    ownerUserId?: string | null;
  };
}) {
  const rules = await prisma.automationRule.findMany({
    where: {
      organizationId: params.organizationId,
      trigger: "ACCOUNT_LIFECYCLE_CHANGED",
      active: true,
      OR: [{ triggerValue: null }, { triggerValue: "" }, { triggerValue: params.account.lifecycleStage ?? "" }],
    },
  });
  if (rules.length === 0) return;

  const actor = await prisma.user.findUnique({
    where: { id: params.actorUserId },
    select: { name: true },
  });
  for (const rule of rules) {
    const recipientRoles = resolveRecipientRoles(rule.recipientRoles);
    const recipientUserIds = resolveRecipientUsers(rule.recipientUsers);
    const accountOwnerLinks = rule.includeAccountOwners
      ? await Promise.all([
          prisma.deal.findMany({
            where: { organizationId: params.organizationId, accountId: params.account.id },
            select: { ownerId: true },
          }),
          prisma.task.findMany({
            where: { organizationId: params.organizationId, accountId: params.account.id },
            select: { assignedToId: true },
          }),
        ])
      : null;

    const inferredOwnerIds = accountOwnerLinks
      ? Array.from(
          new Set([
            ...(params.account.ownerUserId ? [params.account.ownerUserId] : []),
            ...accountOwnerLinks[0].map((deal) => deal.ownerId),
            ...accountOwnerLinks[1].map((task) => task.assignedToId),
          ]),
        )
      : params.account.ownerUserId
        ? [params.account.ownerUserId]
        : [];

    const recipients = await prisma.membership.findMany({
      where: {
        organizationId: params.organizationId,
        OR: [
          { role: { in: recipientRoles } },
          ...(recipientUserIds.length > 0 ? [{ userId: { in: recipientUserIds } }] : []),
          ...(inferredOwnerIds.length > 0 ? [{ userId: { in: inferredOwnerIds } }] : []),
        ],
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    const subject = renderTemplate(rule.subjectTemplate, {
      accountName: params.account.name,
      lifecycleStage: params.account.lifecycleStage ?? "Unspecified",
      previousLifecycleStage: params.previousLifecycleStage ?? "Unspecified",
      accountStatus: params.account.status,
      segment: params.account.segment ?? "Unsegmented",
      actorName: actor?.name ?? "System",
    });
    const body = renderTemplate(rule.bodyTemplate, {
      accountName: params.account.name,
      lifecycleStage: params.account.lifecycleStage ?? "Unspecified",
      previousLifecycleStage: params.previousLifecycleStage ?? "Unspecified",
      accountStatus: params.account.status,
      segment: params.account.segment ?? "Unsegmented",
      actorName: actor?.name ?? "System",
    });

    if (rule.channel === "IN_APP") {
      await queueOrganizationNotification({
        organizationId: params.organizationId,
        type: "ACCOUNT_LIFECYCLE_CHANGED",
        title: subject,
        message: body,
        roles: Array.from(
          new Set(
            recipients
              .map((recipient) => recipient.role)
              .filter((role): role is MembershipRole => Boolean(role)),
          ),
        ),
        userIds: recipients.map((recipient) => recipient.userId),
      });
    }

    if (rule.channel === "EMAIL") {
      for (const recipient of recipients) {
        await queueEmail({
          organizationId: params.organizationId,
          recipientEmail: recipient.user.email,
          subject,
          body,
          relatedEntityType: "account",
          relatedEntityId: params.account.id,
        });
      }
    }
  }
}

async function getOrgSequence(organizationId: string, prefix: string) {
  const count = await prisma.invoice.count({ where: { organizationId } });
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

async function ensureDefaultStages(organizationId: string) {
  const stageCount = await prisma.pipelineStage.count({ where: { organizationId } });
  if (stageCount > 0) return;

  await prisma.pipelineStage.createMany({
    data: [
      { organizationId, name: "Lead", sortOrder: 1, probability: 10, color: "#6ee7ff" },
      { organizationId, name: "Discovery", sortOrder: 2, probability: 25, color: "#9b8cff" },
      { organizationId, name: "Proposal", sortOrder: 3, probability: 50, color: "#ffbf69" },
      { organizationId, name: "Negotiation", sortOrder: 4, probability: 75, color: "#34d399" },
      { organizationId, name: "Won", sortOrder: 5, probability: 100, color: "#10b981" },
    ],
  });
}

async function ensureDefaultAutomation(organizationId: string) {
  const ruleCount = await prisma.automationRule.count({ where: { organizationId } });
  if (ruleCount > 0) return;

  await prisma.automationRule.createMany({
    data: [
      {
        organizationId,
        name: "Due task reminder",
        trigger: "TASK_DUE",
        channel: "EMAIL",
        delayDays: 0,
        subjectTemplate: "Reminder: {{taskTitle}}",
        bodyTemplate: "A task for {{accountName}} is due today.",
      },
      {
        organizationId,
        name: "Overdue invoice reminder",
        trigger: "INVOICE_OVERDUE",
        channel: "EMAIL",
        delayDays: 0,
        subjectTemplate: "Invoice {{invoiceNumber}} is overdue",
        bodyTemplate: "Invoice {{invoiceNumber}} for {{accountName}} needs follow-up.",
      },
      {
        organizationId,
        name: "Deal stage alert",
        trigger: "DEAL_STAGE_CHANGED",
        channel: "IN_APP",
        delayDays: 0,
        subjectTemplate: "Deal moved stage",
        bodyTemplate: "{{dealName}} moved to {{stageName}}.",
      },
      {
        organizationId,
        name: "Customer lifecycle alert",
        trigger: "ACCOUNT_LIFECYCLE_CHANGED",
        channel: "IN_APP",
        delayDays: 0,
        triggerValue: "Churn Risk",
        recipientRoles: "OWNER,ADMIN",
        subjectTemplate: "{{accountName}} moved to {{lifecycleStage}}",
        bodyTemplate:
          "{{accountName}} changed from {{previousLifecycleStage}} to {{lifecycleStage}}. Status: {{accountStatus}}. Segment: {{segment}}.",
      },
    ],
  });
}

export async function getShellData() {
  const workspace = await resolveWorkspaceWithMemberships();
  const organizations = workspace.memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    industry: membership.organization.industry,
    role: membership.role,
  }));

  return {
    session: workspace.session,
    organizations,
  };
}

export async function loginWithCredentials(email: string, password: string) {
  await ensureSeedData();
  const { validateCredentials } = await import("@/lib/auth");
  const result = await validateCredentials(email, password);
  if (!result) return { error: "Invalid email or password." };

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await setSession({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.membership.role,
    organizationId: result.membership.organizationId,
    organizationName: result.membership.organization.name,
    organizationSlug: result.membership.organization.slug,
    expiresAt: expiresAt.toISOString(),
  });

  return { success: true };
}

export async function logoutWorkspace() {
  const { clearSession } = await import("@/lib/auth");
  await clearSession();
}

export async function switchOrganization(organizationId: string) {
  const workspace = await resolveWorkspaceWithMemberships();
  const membership = workspace.memberships.find((item) => item.organization.id === organizationId);
  if (!membership) return { error: "You do not have access to that organization." };

  await setSession({
    ...workspace.session,
    role: membership.role,
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
  });

  return { success: true };
}

export async function getDashboardData() {
  const { organizationId, session } = await resolveWorkspace();
  await ensureDefaultStages(organizationId);
  await ensureDefaultAutomation(organizationId);

  const [counts, stages, activities, dueTasks, overdueInvoices, emailLogs, recentDeals, recentInvoices] = await Promise.all([
    Promise.all([
      prisma.account.count({ where: { organizationId } }),
      prisma.contact.count({ where: { organizationId } }),
      prisma.deal.count({ where: { organizationId, status: "OPEN" } }),
      prisma.task.count({ where: { organizationId, status: "PENDING", dueAt: { lte: endOfDay() } } }),
      prisma.invoice.count({ where: { organizationId, status: "OVERDUE" } }),
      prisma.emailLog.count({ where: { organizationId, status: "SENT" } }),
    ]),
    prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { sortOrder: "asc" },
      include: {
        deals: {
          where: { status: "OPEN" },
          include: {
            account: true,
            contact: true,
            owner: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: true },
    }),
    prisma.task.findMany({
      where: { organizationId, status: "PENDING", dueAt: { lte: endOfDay() } },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: {
        account: true,
        contact: true,
        deal: true,
        assignedTo: true,
      },
    }),
    prisma.invoice.findMany({
      where: { organizationId, status: "OVERDUE" },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        account: true,
        deal: true,
        createdBy: true,
      },
    }),
    prisma.emailLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.deal.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        account: true,
        stage: true,
        owner: true,
      },
    }),
    prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        account: true,
        deal: true,
        createdBy: true,
      },
    }),
  ]);

  const [invoicesForTrend, tasksForTrend, taskSchedule, accountsForTrend] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId },
      select: {
        issueDate: true,
        total: true,
      },
      orderBy: { issueDate: "asc" },
    }),
    prisma.task.findMany({
      where: { organizationId },
      select: {
        createdAt: true,
        dueAt: true,
        status: true,
      },
      orderBy: { dueAt: "asc" },
    }),
    prisma.task.findMany({
      where: { organizationId },
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        notes: true,
        account: {
          select: {
            name: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { dueAt: "asc" },
    }),
    prisma.account.findMany({
      where: { organizationId },
      select: {
        healthScore: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  const [accountOwnership, accountsNeedingReview, atRiskAccounts, reviewReminderHistory] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.account.findMany({
      where: {
        organizationId,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: endOfDay() } }],
      },
      orderBy: [{ nextReviewAt: "asc" }, { updatedAt: "desc" }],
      take: 6,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.account.findMany({
      where: {
        organizationId,
        OR: [{ status: "AT_RISK" }, { lifecycleStage: "Churn Risk" }, { healthScore: { lt: 60 } }],
      },
      orderBy: [{ healthScore: "asc" }, { updatedAt: "desc" }],
      take: 6,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.notification.findMany({
      where: {
        organizationId,
        type: "ACCOUNT_REVIEW_REMINDER",
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  const [accounts, contacts, openDeals, dueTaskCount, overdueInvoiceCount, sentEmails] = counts;
  const totalValue = await prisma.deal.aggregate({
    where: { organizationId, status: "OPEN" },
    _sum: { value: true },
  });
  const ownerSummary = accountOwnership.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    reviewDueCount: accountsNeedingReview.reduce(
      (count, account) => count + (account.owner?.id === membership.user.id ? 1 : 0),
      0,
    ),
    totalOwnedAccounts: 0,
    atRiskCount: atRiskAccounts.reduce(
      (count, account) => count + (account.owner?.id === membership.user.id ? 1 : 0),
      0,
    ),
  }));
  const ownedAccountCounts = await prisma.account.groupBy({
    by: ["ownerUserId"],
    where: {
      organizationId,
      ownerUserId: { not: null },
    },
    _count: { _all: true },
  });
  const ownedCountMap = new Map(
    ownedAccountCounts.map((entry) => [entry.ownerUserId, entry._count._all]),
  );
  const finalOwnerSummary = ownerSummary.map((owner) => ({
    ...owner,
    totalOwnedAccounts: ownedCountMap.get(owner.id) ?? 0,
  }));

  const monthlyRevenueTrend = buildMonthlySeries(
    invoicesForTrend,
    (invoice) => invoice.issueDate,
    (invoice) => invoice.total,
    12,
  );
  const healthTrend = buildMonthlyAverageSeries(
    accountsForTrend,
    (account) => account.updatedAt,
    (account) => account.healthScore,
    12,
  );
  const weeklyRevenueTrend = buildDailySeries(
    invoicesForTrend,
    (invoice) => invoice.issueDate,
    (invoice) => invoice.total,
    7,
  );
  const taskTrend = buildDailySeries(
    tasksForTrend,
    (task) => task.dueAt,
    () => 1,
    7,
  );
  const taskStatusBreakdown = ["Pending", "Completed", "Cancelled"].map((label) => ({
    label,
    value: tasksForTrend.filter((task) => bucketTaskStatus(task.status) === label).length,
  }));
  const healthBuckets = ["Healthy", "Watch", "At Risk"].map((label) => ({
    label,
    value: accountsForTrend.filter((account) => bucketHealthScore(account.healthScore) === label).length,
  }));

  return {
    session,
    organizations: await prisma.membership.findMany({
      where: { userId: session.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            industry: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    counts: {
      accounts,
      contacts,
      openDeals,
      dueTasks: dueTaskCount,
      overdueInvoices: overdueInvoiceCount,
      sentEmails,
      pipelineValue: totalValue._sum.value ?? 0,
    },
    stages,
    dueTasks,
    overdueInvoices,
    emailLogs,
    activities,
    recentDeals,
    recentInvoices,
    ownerSummary: finalOwnerSummary,
    accountsNeedingReview,
    atRiskAccounts,
    reviewReminderHistory,
    visuals: {
      monthlyRevenueTrend,
      healthTrend,
      weeklyRevenueTrend,
      taskTrend,
    taskStatusBreakdown,
    healthBuckets,
      taskSchedule,
    },
  };
}

export async function getAccountsData(filters?: {
  query?: string;
  status?: string;
  lifecycleStage?: string;
  segment?: string;
  ownerUserId?: string;
  view?: string;
}) {
  const { organizationId } = await resolveWorkspace();
  await ensureDefaultStages(organizationId);
  const search = filters?.query?.trim();
  const view = filters?.view?.trim();
  return prisma.account.findMany({
    where: {
      organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.lifecycleStage ? { lifecycleStage: filters.lifecycleStage } : {}),
      ...(filters?.segment ? { segment: filters.segment } : {}),
      ...(filters?.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
      ...(view === "all-active"
        ? { status: "ACTIVE" }
        : view === "churn-risk"
          ? {
              OR: [
                { status: "AT_RISK" },
                { lifecycleStage: "Churn Risk" },
                { healthScore: { lt: 60 } },
              ],
            }
          : view === "renewals"
            ? { lifecycleStage: "Renewal" }
            : view === "review-needed"
              ? {
                  OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
                }
              : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { industry: { contains: search, mode: "insensitive" } },
              { website: { contains: search, mode: "insensitive" } },
              { source: { contains: search, mode: "insensitive" } },
              { headquarters: { contains: search, mode: "insensitive" } },
              { tags: { contains: search, mode: "insensitive" } },
              { contacts: { some: { name: { contains: search, mode: "insensitive" } } } },
              { contacts: { some: { email: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      contacts: { orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] },
      deals: {
        include: { stage: true, owner: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
      },
      tasks: {
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          contact: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 4,
      },
      invoices: {
        orderBy: { updatedAt: "desc" },
        take: 3,
      },
      _count: {
        select: {
          contacts: true,
          deals: true,
          tasks: true,
          invoices: true,
        },
      },
    },
  });
}

export async function getAccountProfileData(accountId: string) {
  const { organizationId } = await resolveWorkspace();
  await ensureDefaultStages(organizationId);

  const account = await prisma.account.findFirst({
    where: { id: accountId, organizationId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      comments: {
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          revisions: {
            include: {
              author: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { versionNumber: "desc" },
          },
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      },
      contacts: { orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] },
      deals: {
        include: { stage: true, owner: true, contact: true },
        orderBy: { updatedAt: "desc" },
      },
      tasks: {
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          contact: {
            select: { id: true, name: true },
          },
          deal: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      invoices: {
        include: {
          deal: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          contacts: true,
          deals: true,
          tasks: true,
          invoices: true,
        },
      },
    },
  });

  if (!account) return null;

  const relatedEntityIds = [
    account.id,
    ...account.comments.map((comment) => comment.id),
    ...account.contacts.map((contact) => contact.id),
    ...account.deals.map((deal) => deal.id),
    ...account.tasks.map((task) => task.id),
    ...account.invoices.map((invoice) => invoice.id),
  ];

  const auditEvents = await prisma.auditEvent.findMany({
    where: {
      organizationId,
      entityId: { in: relatedEntityIds },
    },
    include: {
      actor: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    account,
    auditEvents,
  };
}

export async function getAccountFilterOptions() {
  const { organizationId } = await resolveWorkspace();
  const [accounts, owners] = await Promise.all([
    prisma.account.findMany({
      where: { organizationId },
      select: {
        segment: true,
        lifecycleStage: true,
      },
    }),
    prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    segments: Array.from(
      new Set(accounts.map((account) => account.segment).filter((segment): segment is string => Boolean(segment))),
    ).sort(),
    lifecycleStages: Array.from(
      new Set(
        accounts
          .map((account) => account.lifecycleStage)
          .filter((lifecycleStage): lifecycleStage is string => Boolean(lifecycleStage)),
      ),
    ).sort(),
    owners: owners.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
    })),
  };
}

export async function getAccountSavedViews() {
  const { organizationId, session } = await resolveWorkspace();
  const accounts = await prisma.account.findMany({
    where: { organizationId },
    select: {
      id: true,
      status: true,
      lifecycleStage: true,
      segment: true,
      ownerUserId: true,
      nextReviewAt: true,
      healthScore: true,
    },
  });
  const today = new Date();

  const views = [
    {
      id: "all-active",
      name: "Active accounts",
      description: "Current customers that should stay visible in the operating queue.",
      href: "/accounts?view=all-active",
      count: accounts.filter((account) => account.status === "ACTIVE").length,
    },
    {
      id: "churn-risk",
      name: "Churn risk",
      description: "Accounts already marked risky in lifecycle or health scoring.",
      href: "/accounts?view=churn-risk",
      count: accounts.filter(
        (account) =>
          account.status === "AT_RISK" || account.lifecycleStage === "Churn Risk" || (account.healthScore ?? 100) < 60,
      ).length,
    },
    {
      id: "renewals",
      name: "Renewals",
      description: "Customers in the renewal motion and worth weekly review.",
      href: "/accounts?view=renewals",
      count: accounts.filter((account) => account.lifecycleStage === "Renewal").length,
    },
    {
      id: "my-book",
      name: "My book of business",
      description: "Accounts explicitly assigned to the current signed-in user.",
      href: `/accounts?ownerUserId=${session.userId}&view=my-book`,
      count: accounts.filter((account) => account.ownerUserId === session.userId).length,
    },
    {
      id: "review-needed",
      name: "Review needed",
      description: "Profiles with a review date due or missing, so they need a refresh pass.",
      href: "/accounts?view=review-needed",
      count: accounts.filter((account) => !account.nextReviewAt || account.nextReviewAt <= today).length,
    },
  ];

  return views;
}

export async function getAccountTeamOptions() {
  const { organizationId } = await resolveWorkspace();
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
  }));
}

export async function getAccountDirectory() {
  const { organizationId } = await resolveWorkspace();
  return prisma.account.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getDealsData() {
  const { organizationId } = await resolveWorkspace();
  await ensureDefaultStages(organizationId);
  const [stages, accounts, contacts, users, deals] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { sortOrder: "asc" },
      include: {
        deals: {
          include: {
            account: true,
            contact: true,
            owner: true,
            stage: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.account.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { account: true },
    }),
    prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.deal.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        account: true,
        contact: true,
        stage: true,
        owner: true,
      },
    }),
  ]);

  return {
    stages,
    accounts,
    contacts,
    users: users.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
    })),
    deals,
  };
}

export async function getTasksData() {
  const { organizationId } = await resolveWorkspace();
  return prisma.task.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    include: {
      account: true,
      contact: true,
      deal: true,
      assignedTo: true,
    },
  });
}

export async function getBillingData() {
  const { organizationId } = await resolveWorkspace();
  return Promise.all([
    prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        account: true,
        deal: true,
        createdBy: true,
      },
    }),
    prisma.account.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.deal.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: { account: true },
    }),
  ]);
}

export async function getWorkspaceSearchData(query: string) {
  const { organizationId } = await resolveWorkspace();
  const term = query.trim();
  if (!term) {
    return {
      query: term,
      accounts: [],
      contacts: [],
      deals: [],
      invoices: [],
      tasks: [],
      users: [],
    };
  }

  const contains = { contains: term, mode: "insensitive" as const };

  const [accounts, contacts, deals, invoices, tasks, users] = await Promise.all([
    prisma.account.findMany({
      where: {
        organizationId,
        OR: [
          { name: contains },
          { industry: contains },
          { segment: contains },
          { notes: contains },
          { profileSummary: contains },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.contact.findMany({
      where: {
        organizationId,
        OR: [{ name: contains }, { title: contains }, { role: contains }, { email: contains }, { phone: contains }],
      },
      orderBy: { updatedAt: "desc" },
      include: { account: true },
      take: 20,
    }),
    prisma.deal.findMany({
      where: {
        organizationId,
        OR: [{ name: contains }, { notes: contains }, { currency: contains }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        account: true,
        contact: true,
        stage: true,
        owner: true,
      },
      take: 20,
    }),
    prisma.invoice.findMany({
      where: {
        organizationId,
        OR: [{ invoiceNumber: contains }, { recipientEmail: contains }, { notes: contains }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        account: true,
        deal: true,
        createdBy: true,
      },
      take: 20,
    }),
    prisma.task.findMany({
      where: {
        organizationId,
        OR: [{ title: contains }, { notes: contains }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        account: true,
        contact: true,
        deal: true,
        assignedTo: true,
      },
      take: 20,
    }),
    prisma.membership.findMany({
      where: {
        organizationId,
        user: {
          OR: [{ name: contains }, { email: contains }],
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        user: true,
      },
      take: 20,
    }),
  ]);

  return { query: term, accounts, contacts, deals, invoices, tasks, users };
}

export async function getAutomationData() {
  const { organizationId } = await resolveWorkspace();
  return Promise.all([
    prisma.automationRule.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        task: {
          include: {
            account: true,
            deal: true,
          },
        },
      },
      take: 20,
    }),
    prisma.emailLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { invoice: { include: { account: true } } },
      take: 20,
    }),
    prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: true },
    }),
    prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
  ]);
}

export async function getSettingsData() {
  const { session, organizationId } = await resolveWorkspace();
  const membership = await getCurrentMembership({ session, organizationId });
  const [members, invitations, org, allUsers] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.invitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    session,
    organization: org,
    emailProvider: getConfiguredEmailProvider(),
    emailConfiguration: getEmailConfigurationStatus(),
    members: membership && canManageMembers(membership.role) ? members : [],
    invitations: membership && canManageMembers(membership.role) ? invitations : [],
    allUsers: membership && canManageMembers(membership.role) ? allUsers : [],
  };
}

export async function sendTestEmail(input: { recipientEmail: string; subject: string; body: string }) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageMembers(workspace.membership.role)) return null;

  const recipientEmail = input.recipientEmail.trim();
  if (!recipientEmail) return null;

  const log = await queueEmail({
    organizationId: workspace.organizationId,
    recipientEmail,
    subject: input.subject,
    body: input.body,
    relatedEntityType: "EmailTest",
    relatedEntityId: workspace.session.userId,
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "email.test_sent",
    entityType: "EmailLog",
    entityId: log.id,
    details: {
      recipientEmail,
      provider: log.provider,
      status: log.status,
      errorMessage: log.errorMessage ?? undefined,
    },
  });

  return log;
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  industry?: string;
  timeZone?: string;
}) {
  const workspace = await resolveWorkspace();
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      industry: input.industry || null,
      timeZone: input.timeZone || "Asia/Kolkata",
      memberships: {
        create: {
          userId: workspace.session.userId,
          role: "OWNER",
          isDefault: true,
        },
      },
    },
  });

  await ensureDefaultStages(organization.id);
  await ensureDefaultAutomation(organization.id);
  await logAudit({
    organizationId: organization.id,
    actorUserId: workspace.session.userId,
    action: "organization.created",
    entityType: "Organization",
    entityId: organization.id,
    details: { name: organization.name, slug: organization.slug },
  });

  await switchOrganization(organization.id);
  return organization;
}

export async function addMember(input: {
  email: string;
  name: string;
  password: string;
  role: MembershipRole;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageMembers(workspace.membership.role)) return null;

  const user = await prisma.user.upsert({
    where: { email: input.email.toLowerCase() },
    update: {
      name: input.name,
      passwordHash: input.password,
    },
    create: {
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.password,
    },
  });

  const membership = await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: workspace.organizationId,
        userId: user.id,
      },
    },
    update: {
      role: input.role,
    },
    create: {
      organizationId: workspace.organizationId,
      userId: user.id,
      role: input.role,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "member.added",
    entityType: "Membership",
    entityId: membership.id,
    details: { email: user.email, role: input.role },
  });

  return membership;
}

export async function createAccount(input: {
  name: string;
  ownerUserId?: string;
  industry?: string;
  website?: string;
  status?: string;
  lifecycleStage?: string;
  segment?: string;
  source?: string;
  tags?: string;
  profileSummary?: string;
  headquarters?: string;
  companySize?: string;
  annualRevenue?: number;
  healthScore?: number;
  nextReviewAt?: string;
  customFields?: string;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const ownerRecord = input.ownerUserId
    ? await prisma.user.findFirst({
        where: {
          id: input.ownerUserId,
          memberships: { some: { organizationId: workspace.organizationId } },
        },
        select: { id: true },
      })
    : null;
  if (input.ownerUserId && !ownerRecord) return null;

  const account = await prisma.account.create({
    data: {
      organizationId: workspace.organizationId,
      ownerUserId: input.ownerUserId || null,
      name: input.name,
      industry: input.industry || null,
      website: input.website || null,
      status: input.status || "ACTIVE",
      lifecycleStage: input.lifecycleStage || null,
      segment: input.segment || null,
      source: input.source || null,
      tags: input.tags || null,
      profileSummary: input.profileSummary || null,
      headquarters: input.headquarters || null,
      companySize: input.companySize || null,
      annualRevenue: input.annualRevenue ?? null,
      healthScore: input.healthScore ?? null,
      nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
      customFields: normalizeCustomFields(input.customFields),
      notes: input.notes || null,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.created",
    entityType: "Account",
    entityId: account.id,
    details: {
      name: account.name,
      lifecycleStage: account.lifecycleStage ?? undefined,
      ownerUserId: account.ownerUserId ?? undefined,
    },
  });

  return account;
}

export async function createContact(input: {
  accountId: string;
  name: string;
  role: string;
  title?: string;
  department?: string;
  influenceLevel?: string;
  preferredChannel?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const accountRecord = await prisma.account.findFirst({
    where: { id: input.accountId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!accountRecord) return null;

  const contact = await prisma.contact.create({
    data: {
      organizationId: workspace.organizationId,
      accountId: input.accountId,
      name: input.name,
      role: input.role,
      title: input.title || null,
      department: input.department || null,
      influenceLevel: input.influenceLevel || null,
      preferredChannel: input.preferredChannel || null,
      linkedinUrl: input.linkedinUrl || null,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "contact.created",
    entityType: "Contact",
    entityId: contact.id,
    details: { name: contact.name, accountId: input.accountId },
  });

  return contact;
}

export async function createAccountComment(input: {
  accountId: string;
  title?: string;
  body: string;
  category?: string;
  pinned?: boolean;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const canModerate = canManageRecords(workspace.membership.role);
  const account = await prisma.account.findFirst({
    where: { id: input.accountId, organizationId: workspace.organizationId },
    select: { id: true, name: true },
  });
  if (!account) return null;

  const comment = await prisma.accountComment.create({
    data: {
      organizationId: workspace.organizationId,
      accountId: account.id,
      authorUserId: workspace.session.userId,
      title: input.title || null,
      body: input.body,
      category: input.category || "GENERAL",
      pinned: canModerate ? Boolean(input.pinned) : false,
    },
    include: {
      author: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.comment.created",
    entityType: "AccountComment",
    entityId: comment.id,
    details: {
      accountId: account.id,
      accountName: account.name,
      category: comment.category,
      pinned: comment.pinned,
    },
  });

  return comment;
}

export async function updateAccountComment(input: {
  commentId: string;
  title?: string;
  body: string;
  category?: string;
  pinned?: boolean;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const comment = await prisma.accountComment.findFirst({
    where: { id: input.commentId, organizationId: workspace.organizationId },
    select: {
      id: true,
      accountId: true,
      authorUserId: true,
      title: true,
      body: true,
      category: true,
      pinned: true,
    },
  });
  if (!comment) return null;
  const canModerate = canManageRecords(workspace.membership.role);
  if (!canModerate && comment.authorUserId !== workspace.session.userId) return null;

  await createAccountCommentRevision({
    organizationId: workspace.organizationId,
    commentId: comment.id,
    authorUserId: workspace.session.userId,
    title: comment.title,
    body: comment.body,
    category: comment.category,
    pinned: comment.pinned,
  });

  const updated = await prisma.accountComment.update({
    where: { id: input.commentId },
    data: {
      title: input.title || null,
      body: input.body,
      category: input.category || "GENERAL",
      pinned: canModerate ? Boolean(input.pinned) : undefined,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.comment.updated",
    entityType: "AccountComment",
    entityId: updated.id,
    details: {
      accountId: comment.accountId,
      category: updated.category,
      pinned: updated.pinned,
    },
  });

  return updated;
}

export async function deleteAccountComment(commentId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  const comment = await prisma.accountComment.findFirst({
    where: { id: commentId, organizationId: workspace.organizationId },
    select: { id: true, accountId: true, authorUserId: true },
  });
  if (!comment) return null;
  if (!canManageRecords(workspace.membership.role) && comment.authorUserId !== workspace.session.userId) return null;

  await prisma.accountComment.delete({
    where: { id: commentId },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.comment.deleted",
    entityType: "AccountComment",
    entityId: commentId,
    details: { accountId: comment.accountId },
  });

  return true;
}

export async function exportAccountsCsv(accountIds?: string[]) {
  const { organizationId } = await resolveWorkspace();
  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      ...(accountIds && accountIds.length > 0 ? { id: { in: accountIds } } : {}),
    },
    include: {
      owner: {
        select: { email: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return stringifyCsv(
    accounts.map((account) => ({
      ownerEmail: account.owner?.email ?? "",
      name: account.name,
      industry: account.industry ?? "",
      website: account.website ?? "",
      status: account.status,
      lifecycleStage: account.lifecycleStage ?? "",
      segment: account.segment ?? "",
      source: account.source ?? "",
      tags: account.tags ?? "",
      profileSummary: account.profileSummary ?? "",
      headquarters: account.headquarters ?? "",
      companySize: account.companySize ?? "",
      annualRevenue: account.annualRevenue?.toString() ?? "",
      healthScore: account.healthScore?.toString() ?? "",
      nextReviewAt: account.nextReviewAt ? account.nextReviewAt.toISOString().slice(0, 10) : "",
      customFields: JSON.stringify(account.customFields ?? {}),
      notes: account.notes ?? "",
    })),
  );
}

export async function exportContactsCsv() {
  const { organizationId } = await resolveWorkspace();
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    include: {
      account: {
        select: { name: true },
      },
    },
    orderBy: [{ account: { name: "asc" } }, { name: "asc" }],
  });

  return stringifyCsv(
    contacts.map((contact) => ({
      accountName: contact.account.name,
      name: contact.name,
      role: contact.role,
      title: contact.title ?? "",
      department: contact.department ?? "",
      influenceLevel: contact.influenceLevel ?? "",
      preferredChannel: contact.preferredChannel ?? "",
      linkedinUrl: contact.linkedinUrl ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      notes: contact.notes ?? "",
    })),
  );
}

export async function importAccountsCsv(csvText: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const rows = parseCsv(csvText);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const name = row.name?.trim();
    if (!name) {
      skipped += 1;
      errors.push(`Row ${index + 2}: missing account name.`);
      continue;
    }
    const ownerEmail = row.ownerEmail?.trim().toLowerCase();
    const owner = ownerEmail
      ? await prisma.user.findFirst({
          where: {
            email: ownerEmail,
            memberships: { some: { organizationId: workspace.organizationId } },
          },
          select: { id: true },
        })
      : null;
    if (ownerEmail && !owner) {
      skipped += 1;
      errors.push(`Row ${index + 2}: owner "${ownerEmail}" was not found in this workspace.`);
      continue;
    }

    const payload = {
      ownerUserId: owner?.id ?? null,
      industry: row.industry || null,
      website: row.website || null,
      status: row.status || "ACTIVE",
      lifecycleStage: row.lifecycleStage || null,
      segment: row.segment || null,
      source: row.source || null,
      tags: row.tags || null,
      profileSummary: row.profileSummary || null,
      headquarters: row.headquarters || null,
      companySize: row.companySize || null,
      annualRevenue: maybeNumber(row.annualRevenue),
      healthScore: maybeNumber(row.healthScore),
      nextReviewAt: maybeDate(row.nextReviewAt),
      customFields: normalizeCustomFields(row.customFields),
      notes: row.notes || null,
    };

    const existing = await prisma.account.findFirst({
      where: { organizationId: workspace.organizationId, name },
      select: { id: true },
    });

    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: {
          name,
          ...payload,
        },
      });
      updated += 1;
    } else {
      await prisma.account.create({
        data: {
          organizationId: workspace.organizationId,
          name,
          ...payload,
        },
      });
      created += 1;
    }
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.csv.imported",
    entityType: "Account",
    details: { created, updated },
  });

  return { created, updated, skipped, total: rows.length, errors };
}

export async function importContactsCsv(csvText: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const rows = parseCsv(csvText);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const accountName = row.accountName?.trim();
    const name = row.name?.trim();
    const role = row.role?.trim();
    if (!accountName || !name || !role) {
      skipped += 1;
      errors.push(`Row ${index + 2}: missing accountName, name, or role.`);
      continue;
    }

    const account = await prisma.account.findFirst({
      where: { organizationId: workspace.organizationId, name: accountName },
      select: { id: true },
    });
    if (!account) {
      skipped += 1;
      errors.push(`Row ${index + 2}: account "${accountName}" was not found.`);
      continue;
    }

    const payload = {
      role,
      title: row.title || null,
      department: row.department || null,
      influenceLevel: row.influenceLevel || null,
      preferredChannel: row.preferredChannel || null,
      linkedinUrl: row.linkedinUrl || null,
      email: row.email || null,
      phone: row.phone || null,
      notes: row.notes || null,
    };

    const existing = await prisma.contact.findFirst({
      where: {
        organizationId: workspace.organizationId,
        accountId: account.id,
        OR: [
          ...(row.email ? [{ email: row.email }] : []),
          { name },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          accountId: account.id,
          name,
          ...payload,
        },
      });
      updated += 1;
    } else {
      await prisma.contact.create({
        data: {
          organizationId: workspace.organizationId,
          accountId: account.id,
          name,
          ...payload,
        },
      });
      created += 1;
    }
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "contact.csv.imported",
    entityType: "Contact",
    details: { created, updated },
  });

  return { created, updated, skipped, total: rows.length, errors };
}

export async function createDeal(input: {
  accountId: string;
  contactId?: string;
  stageId: string;
  ownerId?: string;
  name: string;
  value: number;
  currency?: string;
  expectedClose?: string;
  nextActionAt?: string;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const [accountRecord, stageRecord] = await Promise.all([
    prisma.account.findFirst({
      where: { id: input.accountId, organizationId: workspace.organizationId },
      select: { id: true },
    }),
    prisma.pipelineStage.findFirst({
      where: { id: input.stageId, organizationId: workspace.organizationId },
      select: { id: true },
    }),
  ]);
  if (!accountRecord || !stageRecord) return null;

  const contactRecord = input.contactId
    ? await prisma.contact.findFirst({
        where: { id: input.contactId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  const ownerRecord = input.ownerId
    ? await prisma.user.findFirst({
        where: {
          id: input.ownerId,
          memberships: { some: { organizationId: workspace.organizationId } },
        },
        select: { id: true },
      })
    : null;
  if ((input.contactId && !contactRecord) || (input.ownerId && !ownerRecord)) return null;

  const deal = await prisma.deal.create({
    data: {
      organizationId: workspace.organizationId,
      accountId: input.accountId,
      contactId: input.contactId || null,
      stageId: input.stageId,
      ownerId: input.ownerId || workspace.session.userId,
      name: input.name,
      value: input.value,
      currency: input.currency || "INR",
      expectedClose: input.expectedClose ? new Date(input.expectedClose) : null,
      nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
      notes: input.notes || null,
    },
  });

  await queueNotification({
    organizationId: workspace.organizationId,
    userId: input.ownerId || workspace.session.userId,
    type: "DEAL_CREATED",
    title: "New deal created",
    message: `${deal.name} was added to the pipeline.`,
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "deal.created",
    entityType: "Deal",
    entityId: deal.id,
    details: { name: deal.name, value: deal.value },
  });

  return deal;
}

export async function updateDealStage(input: {
  dealId: string;
  stageId: string;
  status?: DealStatus;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const dealCheck = await prisma.deal.findFirst({
    where: { id: input.dealId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  const stageCheck = await prisma.pipelineStage.findFirst({
    where: { id: input.stageId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!dealCheck || !stageCheck) return null;

  const deal = await prisma.deal.update({
    where: { id: input.dealId },
    data: {
      stageId: input.stageId,
      status: input.status || "OPEN",
    },
    include: {
      stage: true,
      account: true,
    },
  });

  const activeRules = await prisma.automationRule.findMany({
    where: {
      organizationId: workspace.organizationId,
      trigger: "DEAL_STAGE_CHANGED",
      active: true,
    },
  });

  for (const rule of activeRules) {
    if (rule.channel === "IN_APP") {
      await queueNotification({
        organizationId: workspace.organizationId,
        userId: workspace.session.userId,
        type: "DEAL_STAGE_CHANGED",
        title: rule.name,
        message: renderTemplate(rule.bodyTemplate, {
          dealName: deal.name,
          stageName: deal.stage.name,
        }),
      });
    }
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "deal.stage.updated",
    entityType: "Deal",
    entityId: deal.id,
    details: { stageId: input.stageId, status: input.status || "OPEN" },
  });

  return deal;
}

export async function createTask(input: {
  accountId?: string;
  contactId?: string;
  dealId?: string;
  assignedToId: string;
  title: string;
  notes?: string;
  dueAt: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const assigneeRecord = await prisma.user.findFirst({
    where: {
      id: input.assignedToId,
      memberships: { some: { organizationId: workspace.organizationId } },
    },
    select: { id: true },
  });
  if (!assigneeRecord) return null;

  const accountRecord = input.accountId
    ? await prisma.account.findFirst({
        where: { id: input.accountId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  const contactRecord = input.contactId
    ? await prisma.contact.findFirst({
        where: { id: input.contactId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  const dealRecord = input.dealId
    ? await prisma.deal.findFirst({
        where: { id: input.dealId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  if ((input.accountId && !accountRecord) || (input.contactId && !contactRecord) || (input.dealId && !dealRecord)) {
    return null;
  }

  const task = await prisma.task.create({
    data: {
      organizationId: workspace.organizationId,
      accountId: input.accountId || null,
      contactId: input.contactId || null,
      dealId: input.dealId || null,
      assignedToId: input.assignedToId,
      title: input.title,
      notes: input.notes || null,
      dueAt: new Date(input.dueAt),
    },
  });

  await queueNotification({
    organizationId: workspace.organizationId,
    userId: input.assignedToId,
    taskId: task.id,
    type: "TASK_CREATED",
    title: "New follow-up scheduled",
    message: task.title,
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
    details: { title: task.title, dueAt: task.dueAt.toISOString() },
  });

  return task;
}

export async function completeTask(taskId: string, notes?: string) {
  const workspace = await resolveWorkspaceWithMembership();
  const taskCheck = await prisma.task.findFirst({
    where: { id: taskId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!taskCheck) return null;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      notes: notes || undefined,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "task.completed",
    entityType: "Task",
    entityId: task.id,
  });

  return task;
}

export async function createInvoice(input: {
  accountId: string;
  dealId?: string;
  kind: InvoiceKind;
  recipientEmail?: string;
  status: InvoiceStatus;
  dueDate?: string;
  subtotal: number;
  tax?: number;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const accountRecord = await prisma.account.findFirst({
    where: { id: input.accountId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  const dealRecord = input.dealId
    ? await prisma.deal.findFirst({
        where: { id: input.dealId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  if (!accountRecord || (input.dealId && !dealRecord)) return null;

  const invoiceNumber = await getOrgSequence(workspace.organizationId, input.kind === "PROFORMA" ? "PF" : "INV");
  const total = input.subtotal + (input.tax ?? 0);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: workspace.organizationId,
      accountId: input.accountId,
      dealId: input.dealId || null,
      createdById: workspace.session.userId,
      kind: input.kind,
      invoiceNumber,
      recipientEmail: input.recipientEmail || null,
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      subtotal: input.subtotal,
      tax: input.tax ?? 0,
      total,
      notes: input.notes || null,
    },
  });

  if (input.recipientEmail && input.status !== "DRAFT") {
    await queueEmail({
      organizationId: workspace.organizationId,
      invoiceId: invoice.id,
      recipientEmail: input.recipientEmail,
      subject: `${input.kind === "PROFORMA" ? "Proforma" : "Invoice"} ${invoice.invoiceNumber}`,
      body: `Your ${input.kind.toLowerCase()} ${invoice.invoiceNumber} is now ${input.status.toLowerCase()}.`,
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
    });
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "invoice.created",
    entityType: "Invoice",
    entityId: invoice.id,
    details: { invoiceNumber, kind: input.kind, total },
  });

  return invoice;
}

export async function updateInvoiceStatus(input: { invoiceId: string; status: InvoiceStatus }) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const invoiceCheck = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!invoiceCheck) return null;

  const invoice = await prisma.invoice.update({
    where: { id: input.invoiceId },
    data: { status: input.status },
    include: { account: true },
  });

  if (invoice.recipientEmail) {
    await queueEmail({
      organizationId: workspace.organizationId,
      invoiceId: invoice.id,
      recipientEmail: invoice.recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} status update`,
      body: `The invoice status is now ${invoice.status.toLowerCase()}.`,
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
    });
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "invoice.status.updated",
    entityType: "Invoice",
    entityId: invoice.id,
    details: { status: invoice.status },
  });

  return invoice;
}

export async function createAutomationRule(input: {
  name: string;
  trigger: AutomationTrigger;
  channel: AutomationChannel;
  delayDays: number;
  triggerValue?: string;
  recipientRoles?: string;
  recipientUsers?: string;
  includeAccountOwners?: boolean;
  subjectTemplate: string;
  bodyTemplate: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  const rule = await prisma.automationRule.create({
    data: {
      organizationId: workspace.organizationId,
      ...input,
      triggerValue: input.triggerValue || null,
      recipientRoles: normalizeRecipientRoles(input.recipientRoles),
      recipientUsers: normalizeRecipientUsers(input.recipientUsers),
      includeAccountOwners: Boolean(input.includeAccountOwners),
      active: true,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "automation.created",
    entityType: "AutomationRule",
    entityId: rule.id,
    details: { name: rule.name, trigger: rule.trigger },
  });

  return rule;
}

export async function runAutomationSweep() {
  const workspace = await resolveWorkspaceWithMembership();
  const now = new Date();

  const dueTasks = await prisma.task.findMany({
    where: {
      organizationId: workspace.organizationId,
      status: "PENDING",
      dueAt: { lte: endOfDay(now) },
      reminderSentAt: null,
    },
    include: {
      account: true,
      assignedTo: true,
    },
  });

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: workspace.organizationId,
      status: "OVERDUE",
    },
    include: {
      account: true,
    },
  });

  const taskRules = await prisma.automationRule.findMany({
    where: { organizationId: workspace.organizationId, trigger: "TASK_DUE", active: true },
  });
  const invoiceRules = await prisma.automationRule.findMany({
    where: { organizationId: workspace.organizationId, trigger: "INVOICE_OVERDUE", active: true },
  });

  let sent = 0;

  for (const task of dueTasks) {
    for (const rule of taskRules) {
      const subject = renderTemplate(rule.subjectTemplate, {
        taskTitle: task.title,
        accountName: task.account?.name ?? "Customer",
        dueDate: task.dueAt.toLocaleDateString("en-IN"),
      });
      const body = renderTemplate(rule.bodyTemplate, {
        taskTitle: task.title,
        accountName: task.account?.name ?? "Customer",
        dueDate: task.dueAt.toLocaleDateString("en-IN"),
      });

      await queueEmail({
        organizationId: workspace.organizationId,
        recipientEmail: task.assignedTo.email,
        subject,
        body,
        relatedEntityType: "task",
        relatedEntityId: task.id,
      });

      await queueNotification({
        organizationId: workspace.organizationId,
        userId: task.assignedToId,
        taskId: task.id,
        type: "TASK_REMINDER",
        title: subject,
        message: body,
      });
      sent += 1;
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { reminderSentAt: now },
    });
  }

  for (const invoice of overdueInvoices) {
    for (const rule of invoiceRules) {
      const subject = renderTemplate(rule.subjectTemplate, {
        invoiceNumber: invoice.invoiceNumber,
        accountName: invoice.account.name,
      });
      const body = renderTemplate(rule.bodyTemplate, {
        invoiceNumber: invoice.invoiceNumber,
        accountName: invoice.account.name,
      });

      await queueEmail({
        organizationId: workspace.organizationId,
        invoiceId: invoice.id,
        recipientEmail: invoice.recipientEmail ?? "billing@customer.example",
        subject,
        body,
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
      });
      sent += 1;
    }
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "automation.sweep",
    entityType: "Automation",
    details: {
      dueTasks: dueTasks.length,
      overdueInvoices: overdueInvoices.length,
      emailsSent: sent,
    },
  });

  return {
    dueTasks: dueTasks.length,
    overdueInvoices: overdueInvoices.length,
    emailsSent: sent,
  };
}

export async function markNotificationRead(notificationId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!notification) return null;
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function updateOrganization(input: {
  name: string;
  slug: string;
  industry?: string;
  timeZone?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageMembers(workspace.membership.role)) return null;

  const organization = await prisma.organization.findFirst({
    where: { id: workspace.organizationId },
    select: { id: true },
  });
  if (!organization) return null;

  const updated = await prisma.organization.update({
    where: { id: workspace.organizationId },
    data: {
      name: input.name,
      slug: input.slug,
      industry: input.industry || null,
      timeZone: input.timeZone || "Asia/Kolkata",
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "organization.updated",
    entityType: "Organization",
    entityId: updated.id,
    details: { name: updated.name, slug: updated.slug },
  });

  return updated;
}

export async function updateAccount(input: {
  accountId: string;
  name: string;
  ownerUserId?: string;
  industry?: string;
  website?: string;
  status?: string;
  lifecycleStage?: string;
  segment?: string;
  source?: string;
  tags?: string;
  profileSummary?: string;
  headquarters?: string;
  companySize?: string;
  annualRevenue?: number;
  healthScore?: number;
  nextReviewAt?: string;
  customFields?: string;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const record = await prisma.account.findFirst({
    where: { id: input.accountId, organizationId: workspace.organizationId },
    select: { id: true, lifecycleStage: true, name: true, ownerUserId: true },
  });
  if (!record) return null;
  const ownerRecord = input.ownerUserId
    ? await prisma.user.findFirst({
        where: {
          id: input.ownerUserId,
          memberships: { some: { organizationId: workspace.organizationId } },
        },
        select: { id: true },
      })
    : null;
  if (input.ownerUserId && !ownerRecord) return null;

  const account = await prisma.account.update({
    where: { id: input.accountId },
    data: {
      ownerUserId: input.ownerUserId || null,
      name: input.name,
      industry: input.industry || null,
      website: input.website || null,
      status: input.status || "ACTIVE",
      lifecycleStage: input.lifecycleStage || null,
      segment: input.segment || null,
      source: input.source || null,
      tags: input.tags || null,
      profileSummary: input.profileSummary || null,
      headquarters: input.headquarters || null,
      companySize: input.companySize || null,
      annualRevenue: input.annualRevenue ?? null,
      healthScore: input.healthScore ?? null,
      nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
      customFields: normalizeCustomFields(input.customFields),
      notes: input.notes || null,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.updated",
    entityType: "Account",
    entityId: account.id,
    details: {
      name: account.name,
      lifecycleStage: account.lifecycleStage ?? undefined,
      previousLifecycleStage: record.lifecycleStage ?? undefined,
      ownerUserId: account.ownerUserId ?? undefined,
      previousOwnerUserId: record.ownerUserId ?? undefined,
    },
  });

  if ((record.lifecycleStage ?? null) !== (account.lifecycleStage ?? null)) {
    await logAudit({
      organizationId: workspace.organizationId,
      actorUserId: workspace.session.userId,
      action: "account.lifecycle.updated",
      entityType: "Account",
      entityId: account.id,
      details: {
        name: account.name,
        previousLifecycleStage: record.lifecycleStage ?? undefined,
        lifecycleStage: account.lifecycleStage ?? undefined,
      },
    });

    await triggerAccountLifecycleAutomation({
      organizationId: workspace.organizationId,
      actorUserId: workspace.session.userId,
      previousLifecycleStage: record.lifecycleStage,
      account: {
        id: account.id,
        name: account.name,
        lifecycleStage: account.lifecycleStage,
        status: account.status,
        segment: account.segment,
        ownerUserId: account.ownerUserId,
      },
    });
  }

  return account;
}

export async function bulkReassignAccounts(input: {
  accountIds: string[];
  ownerUserId?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;
  const accountIds = Array.from(new Set(input.accountIds.filter(Boolean)));
  if (accountIds.length === 0) return null;

  const ownerRecord = input.ownerUserId
    ? await prisma.user.findFirst({
        where: {
          id: input.ownerUserId,
          memberships: { some: { organizationId: workspace.organizationId } },
        },
        select: { id: true },
      })
    : null;
  if (input.ownerUserId && !ownerRecord) return null;

  const result = await prisma.account.updateMany({
    where: {
      organizationId: workspace.organizationId,
      id: { in: accountIds },
    },
    data: {
      ownerUserId: input.ownerUserId || null,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.bulk_reassigned",
    entityType: "Account",
    details: {
      ownerUserId: input.ownerUserId ?? null,
      accountIds,
      updatedCount: result.count,
    },
  });

  return result;
}

export async function bulkUpdateAccounts(input: {
  accountIds: string[];
  applyOwnerChange?: boolean;
  ownerUserId?: string;
  applyTagChange?: boolean;
  tagMode?: "REPLACE" | "APPEND" | "REMOVE";
  tags?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const accountIds = Array.from(new Set(input.accountIds.filter(Boolean)));
  if (accountIds.length === 0) return null;

  const normalizedTags = normalizeTagList(input.tags);
  if (!input.applyOwnerChange && !input.applyTagChange) return null;
  if (input.applyTagChange && input.tagMode !== "REPLACE" && normalizedTags.length === 0) return null;

  const ownerRecord = input.applyOwnerChange && input.ownerUserId
    ? await prisma.user.findFirst({
        where: {
          id: input.ownerUserId,
          memberships: { some: { organizationId: workspace.organizationId } },
        },
        select: { id: true },
      })
    : null;
  if (input.applyOwnerChange && input.ownerUserId && !ownerRecord) return null;

  const accounts = await prisma.account.findMany({
    where: {
      organizationId: workspace.organizationId,
      id: { in: accountIds },
    },
    select: {
      id: true,
      ownerUserId: true,
      tags: true,
    },
  });

  let updatedCount = 0;
  const tagMode = input.tagMode ?? "REPLACE";

  for (const account of accounts) {
    const data: { ownerUserId?: string | null; tags?: string | null } = {};

    if (input.applyOwnerChange) {
      data.ownerUserId = input.ownerUserId || null;
    }

    if (input.applyTagChange) {
      data.tags = mergeTagList(account.tags, normalizedTags, tagMode);
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.account.update({
      where: { id: account.id },
      data,
    });
    updatedCount += 1;
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.bulk_updated",
    entityType: "Account",
    details: {
      accountIds,
      updatedCount,
      ownerUserId: input.applyOwnerChange ? input.ownerUserId ?? null : undefined,
      applyTagChange: input.applyTagChange ?? false,
      tagMode: input.applyTagChange ? tagMode : undefined,
      tags: input.applyTagChange ? normalizedTags : undefined,
    },
  });

  return {
    updatedCount,
    accountIds,
  };
}

export async function sendAccountReviewReminders() {
  const workspace = await resolveWorkspaceWithMembership();
  const dueAccounts = await prisma.account.findMany({
    where: {
      organizationId: workspace.organizationId,
      ownerUserId: { not: null },
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: endOfDay() } }],
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ ownerUserId: "asc" }, { nextReviewAt: "asc" }],
  });

  const byOwner = new Map<
    string,
    Array<(typeof dueAccounts)[number]>
  >();

  for (const account of dueAccounts) {
    if (!account.owner) continue;
    const existing = byOwner.get(account.owner.id) ?? [];
    existing.push(account);
    byOwner.set(account.owner.id, existing);
  }

  let remindersSent = 0;

  for (const [ownerId, accounts] of byOwner.entries()) {
    const owner = accounts[0]?.owner;
    if (!owner) continue;

    const subject = `${accounts.length} account review reminder${accounts.length === 1 ? "" : "s"}`;
    const body = accounts
      .slice(0, 5)
      .map((account) => {
        const dueLabel = account.nextReviewAt ? account.nextReviewAt.toLocaleDateString("en-IN") : "no review date";
        return `${account.name} (${dueLabel})`;
      })
      .join("\n");

    await queueNotification({
      organizationId: workspace.organizationId,
      userId: ownerId,
      type: "ACCOUNT_REVIEW_REMINDER",
      title: subject,
      message: body,
    });

    await queueEmail({
      organizationId: workspace.organizationId,
      recipientEmail: owner.email,
      subject,
      body,
      relatedEntityType: "account",
      relatedEntityId: accounts[0]?.id,
    });

    remindersSent += 1;
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.review_reminders.sent",
    entityType: "Account",
    details: {
      ownersReminded: byOwner.size,
      dueAccounts: dueAccounts.length,
      remindersSent,
    },
  });

  return {
    ownersReminded: byOwner.size,
    dueAccounts: dueAccounts.length,
    remindersSent,
  };
}

export async function deleteAccount(accountId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const record = await prisma.account.findFirst({
    where: { id: accountId, organizationId: workspace.organizationId },
    include: { _count: { select: { invoices: true } } },
  });
  if (!record || record._count.invoices > 0) return null;

  await prisma.account.delete({
    where: { id: accountId },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "account.deleted",
    entityType: "Account",
    entityId: accountId,
  });

  return true;
}

export async function updateContact(input: {
  contactId: string;
  accountId: string;
  name: string;
  role: string;
  title?: string;
  department?: string;
  influenceLevel?: string;
  preferredChannel?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const [contactRecord, accountRecord] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: input.contactId, organizationId: workspace.organizationId },
      select: { id: true },
    }),
    prisma.account.findFirst({
      where: { id: input.accountId, organizationId: workspace.organizationId },
      select: { id: true },
    }),
  ]);
  if (!contactRecord || !accountRecord) return null;

  const contact = await prisma.contact.update({
    where: { id: input.contactId },
    data: {
      accountId: input.accountId,
      name: input.name,
      role: input.role,
      title: input.title || null,
      department: input.department || null,
      influenceLevel: input.influenceLevel || null,
      preferredChannel: input.preferredChannel || null,
      linkedinUrl: input.linkedinUrl || null,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "contact.updated",
    entityType: "Contact",
    entityId: contact.id,
    details: { name: contact.name },
  });

  return contact;
}

export async function deleteContact(contactId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!contact) return null;

  await prisma.contact.delete({ where: { id: contactId } });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "contact.deleted",
    entityType: "Contact",
    entityId: contactId,
  });

  return true;
}

export async function updateDeal(input: {
  dealId: string;
  accountId: string;
  contactId?: string;
  stageId: string;
  ownerId?: string;
  name: string;
  value: number;
  currency?: string;
  expectedClose?: string;
  nextActionAt?: string;
  status?: DealStatus;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const [dealRecord, accountRecord, stageRecord] = await Promise.all([
    prisma.deal.findFirst({
      where: { id: input.dealId, organizationId: workspace.organizationId },
      select: { id: true },
    }),
    prisma.account.findFirst({
      where: { id: input.accountId, organizationId: workspace.organizationId },
      select: { id: true },
    }),
    prisma.pipelineStage.findFirst({
      where: { id: input.stageId, organizationId: workspace.organizationId },
      select: { id: true },
    }),
  ]);
  if (!dealRecord || !accountRecord || !stageRecord) return null;

  const contactRecord = input.contactId
    ? await prisma.contact.findFirst({
        where: { id: input.contactId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  const ownerRecord = input.ownerId
    ? await prisma.user.findFirst({
        where: {
          id: input.ownerId,
          memberships: { some: { organizationId: workspace.organizationId } },
        },
        select: { id: true },
      })
    : null;
  if ((input.contactId && !contactRecord) || (input.ownerId && !ownerRecord)) return null;

  const deal = await prisma.deal.update({
    where: { id: input.dealId },
    data: {
      accountId: input.accountId,
      contactId: input.contactId || null,
      stageId: input.stageId,
      ownerId: input.ownerId || workspace.session.userId,
      name: input.name,
      value: input.value,
      currency: input.currency || "INR",
      expectedClose: input.expectedClose ? new Date(input.expectedClose) : null,
      nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
      status: input.status || "OPEN",
      notes: input.notes || null,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "deal.updated",
    entityType: "Deal",
    entityId: deal.id,
    details: { name: deal.name, status: deal.status },
  });

  return deal;
}

export async function deleteDeal(dealId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!deal) return null;

  await prisma.deal.delete({ where: { id: dealId } });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "deal.deleted",
    entityType: "Deal",
    entityId: dealId,
  });

  return true;
}

export async function updateTask(input: {
  taskId: string;
  accountId?: string;
  contactId?: string;
  dealId?: string;
  assignedToId: string;
  title: string;
  notes?: string;
  dueAt: string;
  status?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const taskRecord = await prisma.task.findFirst({
    where: { id: input.taskId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!taskRecord) return null;

  const accountRecord = input.accountId
    ? await prisma.account.findFirst({
        where: { id: input.accountId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  const contactRecord = input.contactId
    ? await prisma.contact.findFirst({
        where: { id: input.contactId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  const dealRecord = input.dealId
    ? await prisma.deal.findFirst({
        where: { id: input.dealId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  const assigneeRecord = await prisma.user.findFirst({
    where: {
      id: input.assignedToId,
      memberships: { some: { organizationId: workspace.organizationId } },
    },
    select: { id: true },
  });
  if (!assigneeRecord) return null;
  if ((input.accountId && !accountRecord) || (input.contactId && !contactRecord) || (input.dealId && !dealRecord)) {
    return null;
  }

  const task = await prisma.task.update({
    where: { id: input.taskId },
    data: {
      accountId: input.accountId || null,
      contactId: input.contactId || null,
      dealId: input.dealId || null,
      assignedToId: input.assignedToId,
      title: input.title,
      notes: input.notes || null,
      dueAt: new Date(input.dueAt),
      status: (input.status as "PENDING" | "COMPLETED" | "CANCELLED") || undefined,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "task.updated",
    entityType: "Task",
    entityId: task.id,
    details: { title: task.title, status: task.status },
  });

  return task;
}

export async function deleteTask(taskId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!task) return null;

  await prisma.task.delete({ where: { id: taskId } });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "task.deleted",
    entityType: "Task",
    entityId: taskId,
  });

  return true;
}

export async function updateInvoice(input: {
  invoiceId: string;
  accountId: string;
  dealId?: string;
  kind: InvoiceKind;
  recipientEmail?: string;
  status: InvoiceStatus;
  dueDate?: string;
  subtotal: number;
  tax?: number;
  notes?: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const invoiceRecord = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, organizationId: workspace.organizationId },
    include: { account: true },
  });
  if (!invoiceRecord) return null;

  const accountRecord = await prisma.account.findFirst({
    where: { id: input.accountId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  const dealRecord = input.dealId
    ? await prisma.deal.findFirst({
        where: { id: input.dealId, organizationId: workspace.organizationId },
        select: { id: true },
      })
    : null;
  if (!accountRecord || (input.dealId && !dealRecord)) return null;

  const total = input.subtotal + (input.tax ?? 0);
  const invoice = await prisma.invoice.update({
    where: { id: input.invoiceId },
    data: {
      accountId: input.accountId,
      dealId: input.dealId || null,
      kind: input.kind,
      recipientEmail: input.recipientEmail || null,
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      subtotal: input.subtotal,
      tax: input.tax ?? 0,
      total,
      notes: input.notes || null,
    },
    include: { account: true },
  });

  if (invoice.recipientEmail && invoice.status !== invoiceRecord.status) {
    await queueEmail({
      organizationId: workspace.organizationId,
      invoiceId: invoice.id,
      recipientEmail: invoice.recipientEmail,
      subject: `${invoice.kind === "PROFORMA" ? "Proforma" : "Invoice"} ${invoice.invoiceNumber} updated`,
      body: `The ${invoice.kind.toLowerCase()} ${invoice.invoiceNumber} is now ${invoice.status.toLowerCase()}.`,
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
    });
  }

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "invoice.updated",
    entityType: "Invoice",
    entityId: invoice.id,
    details: { invoiceNumber: invoice.invoiceNumber, status: invoice.status },
  });

  return invoice;
}

export async function deleteInvoice(invoiceId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageRecords(workspace.membership.role)) return null;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!invoice) return null;

  await prisma.invoice.delete({ where: { id: invoiceId } });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "invoice.deleted",
    entityType: "Invoice",
    entityId: invoiceId,
  });

  return true;
}

export async function updateAutomationRule(input: {
  ruleId: string;
  name: string;
  trigger: AutomationTrigger;
  channel: AutomationChannel;
  active: boolean;
  delayDays: number;
  triggerValue?: string;
  recipientRoles?: string;
  recipientUsers?: string;
  includeAccountOwners?: boolean;
  subjectTemplate: string;
  bodyTemplate: string;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageMembers(workspace.membership.role)) return null;

  const ruleRecord = await prisma.automationRule.findFirst({
    where: { id: input.ruleId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!ruleRecord) return null;

  const rule = await prisma.automationRule.update({
    where: { id: input.ruleId },
    data: {
      name: input.name,
      trigger: input.trigger,
      channel: input.channel,
      active: input.active,
      delayDays: input.delayDays,
      triggerValue: input.triggerValue || null,
      recipientRoles: normalizeRecipientRoles(input.recipientRoles),
      recipientUsers: normalizeRecipientUsers(input.recipientUsers),
      includeAccountOwners: Boolean(input.includeAccountOwners),
      subjectTemplate: input.subjectTemplate,
      bodyTemplate: input.bodyTemplate,
    },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "automation.updated",
    entityType: "AutomationRule",
    entityId: rule.id,
    details: { name: rule.name, trigger: rule.trigger, active: rule.active },
  });

  return rule;
}

export async function deleteAutomationRule(ruleId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageMembers(workspace.membership.role)) return null;

  const rule = await prisma.automationRule.findFirst({
    where: { id: ruleId, organizationId: workspace.organizationId },
    select: { id: true },
  });
  if (!rule) return null;

  await prisma.automationRule.delete({ where: { id: ruleId } });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "automation.deleted",
    entityType: "AutomationRule",
    entityId: ruleId,
  });

  return true;
}

export async function updateMemberRole(input: {
  membershipId: string;
  role: MembershipRole;
}) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageMembers(workspace.membership.role)) return null;

  const membership = await prisma.membership.findFirst({
    where: { id: input.membershipId, organizationId: workspace.organizationId },
    include: { user: true },
  });
  if (!membership) return null;

  const updated = await prisma.membership.update({
    where: { id: input.membershipId },
    data: { role: input.role },
  });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "member.updated",
    entityType: "Membership",
    entityId: updated.id,
    details: { email: membership.user.email, role: updated.role },
  });

  return updated;
}

export async function removeMember(membershipId: string) {
  const workspace = await resolveWorkspaceWithMembership();
  if (!canManageMembers(workspace.membership.role)) return null;

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: workspace.organizationId },
    include: { user: true },
  });
  if (!membership) return null;

  await prisma.membership.delete({ where: { id: membershipId } });

  await logAudit({
    organizationId: workspace.organizationId,
    actorUserId: workspace.session.userId,
    action: "member.removed",
    entityType: "Membership",
    entityId: membershipId,
    details: { email: membership.user.email, role: membership.role },
  });

  return true;
}

export function formatMoney(value: number) {
  return money(value);
}

export async function ensureWorkspaceDefaults() {
  const { organizationId } = await resolveWorkspace();
  await ensureDefaultStages(organizationId);
  await ensureDefaultAutomation(organizationId);
}

export async function getAnalyticsSummary() {
  const { organizationId, session } = await resolveWorkspace();
  await ensureDefaultStages(organizationId);

  const [
    accountsCount,
    contactsCount,
    openDealsCount,
    wonDealsCount,
    lostDealsCount,
    totalDealsValueAgg,
    wonDealsValueAgg,
    openDealsValueAgg,
    invoicesCount,
    overdueInvoicesCount,
    invoicesPaidValueAgg,
    invoicesTotalValueAgg,
    tasksCount,
    completedTasksCount,
    pendingTasksCount,
    cancelledTasksCount,
  ] = await Promise.all([
    prisma.account.count({ where: { organizationId } }),
    prisma.contact.count({ where: { organizationId } }),
    prisma.deal.count({ where: { organizationId, status: "OPEN" } }),
    prisma.deal.count({ where: { organizationId, status: "WON" } }),
    prisma.deal.count({ where: { organizationId, status: "LOST" } }),
    prisma.deal.aggregate({ where: { organizationId }, _sum: { value: true } }),
    prisma.deal.aggregate({ where: { organizationId, status: "WON" }, _sum: { value: true } }),
    prisma.deal.aggregate({ where: { organizationId, status: "OPEN" }, _sum: { value: true } }),
    prisma.invoice.count({ where: { organizationId } }),
    prisma.invoice.count({ where: { organizationId, status: "OVERDUE" } }),
    prisma.invoice.aggregate({ where: { organizationId, status: "PAID" }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { organizationId }, _sum: { total: true } }),
    prisma.task.count({ where: { organizationId } }),
    prisma.task.count({ where: { organizationId, status: "COMPLETED" } }),
    prisma.task.count({ where: { organizationId, status: "PENDING" } }),
    prisma.task.count({ where: { organizationId, status: "CANCELLED" } }),
  ]);

  const [stages, users, accountsWithSource, accountsWithCountry, accountsWithIndustry, dealsWithOwners] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { sortOrder: "asc" },
      include: {
        deals: {
          include: { owner: true, account: true },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        memberships: { some: { organizationId } },
      },
      select: { id: true, name: true, email: true },
    }),
    prisma.account.findMany({
      where: { organizationId, source: { not: null } },
      select: { source: true },
    }),
    prisma.account.findMany({
      where: { organizationId, headquarters: { not: null } },
      select: { headquarters: true },
    }),
    prisma.account.findMany({
      where: { organizationId, industry: { not: null } },
      select: { industry: true },
    }),
    prisma.deal.findMany({
      where: { organizationId },
      include: { owner: true, stage: true },
    }),
  ]);

  const ownerPerformance = Array.from(
    dealsWithOwners.reduce((map, deal) => {
      const ownerId = deal.owner?.id ?? "unassigned";
      const current = map.get(ownerId) ?? {
        id: ownerId,
        name: deal.owner?.name ?? "Unassigned",
        value: 0,
        count: 0,
        wonCount: 0,
        openCount: 0,
      };
      current.value += deal.value;
      current.count += 1;
      if (deal.status === "WON") current.wonCount += 1;
      if (deal.status === "OPEN") current.openCount += 1;
      map.set(ownerId, current);
      return map;
    }, new Map<string, { id: string; name: string; value: number; count: number; wonCount: number; openCount: number }>()),
  )
    .sort((a, b) => b[1].value - a[1].value)
    .map(([, value]) => value);

  return {
    session,
    counts: {
      accounts: accountsCount,
      contacts: contactsCount,
      openDeals: openDealsCount,
      wonDeals: wonDealsCount,
      lostDeals: lostDealsCount,
      totalDealsValue: totalDealsValueAgg._sum.value ?? 0,
      wonDealsValue: wonDealsValueAgg._sum.value ?? 0,
      openDealsValue: openDealsValueAgg._sum.value ?? 0,
      invoices: invoicesCount,
      overdueInvoices: overdueInvoicesCount,
      paidInvoicesValue: invoicesPaidValueAgg._sum.total ?? 0,
      totalInvoicesValue: invoicesTotalValueAgg._sum.total ?? 0,
      tasks: tasksCount,
      completedTasks: completedTasksCount,
      pendingTasks: pendingTasksCount,
      cancelledTasks: cancelledTasksCount,
    },
    stages,
    users,
    accountsWithSource,
    accountsWithCountry,
    accountsWithIndustry,
    dealsWithOwners,
    visuals: {
      ownerPerformance,
      sourceBreakdown: countBy(accountsWithSource, (account) => account.source, 5),
      locationBreakdown: countBy(accountsWithCountry, (account) => account.headquarters, 5),
      industryBreakdown: countBy(accountsWithIndustry, (account) => account.industry, 5),
      stageFunnel: stages.map((stage) => ({
        label: stage.name,
        count: stage.deals.length,
        value: stage.deals.reduce((sum, deal) => sum + deal.value, 0),
      })),
      ownerLabels: users.map((user) => ({ id: user.id, name: user.name })),
    },
  };
}

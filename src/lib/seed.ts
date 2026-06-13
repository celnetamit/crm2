import { prisma } from "@/lib/db";
import { isDemoSeedingEnabled } from "@/lib/env";
import { hashPassword } from "@/lib/password";

let seedingPromise: Promise<void> | null = null;

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function ensureSeedData() {
  if (!isDemoSeedingEnabled()) return;
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    const orgCount = await prisma.organization.count();
    if (orgCount > 0) return;

    const passwordHash = hashPassword("crm2@123");

    const owner = await prisma.user.create({
      data: {
        email: "owner@crm2.app",
        name: "Asha Mehta",
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: "ops@crm2.app",
        name: "Kabir Rao",
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        email: "sales@crm2.app",
        name: "Nina Patel",
        passwordHash,
      },
    });

    const northstar = await prisma.organization.create({
      data: {
        name: "Northstar Journals",
        slug: "northstar-journals",
        industry: "Publishing",
        memberships: {
          create: [
            { userId: owner.id, role: "OWNER", isDefault: true },
            { userId: admin.id, role: "ADMIN" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });

    const horizon = await prisma.organization.create({
      data: {
        name: "Horizon Research Group",
        slug: "horizon-research-group",
        industry: "Research Services",
        memberships: {
          create: [
            { userId: owner.id, role: "ADMIN" },
            { userId: admin.id, role: "OWNER", isDefault: true },
          ],
        },
      },
    });

    async function createStages(organizationId: string) {
      return prisma.pipelineStage.createMany({
        data: [
          { organizationId, name: "Lead", sortOrder: 1, probability: 10, color: "#6ee7ff" },
          { organizationId, name: "Discovery", sortOrder: 2, probability: 25, color: "#9b8cff" },
          { organizationId, name: "Proposal", sortOrder: 3, probability: 50, color: "#ffbf69" },
          { organizationId, name: "Negotiation", sortOrder: 4, probability: 75, color: "#34d399" },
          { organizationId, name: "Won", sortOrder: 5, probability: 100, color: "#10b981" },
        ],
      });
    }

    await createStages(northstar.id);
    await createStages(horizon.id);

    await prisma.account.createMany({
      data: [
        {
          organizationId: northstar.id,
          name: "IIT Bombay Library",
          industry: "Education",
          website: "https://iitb.ac.in",
          notes: "Needs annual renewal pack and courier follow-up.",
        },
        {
          organizationId: northstar.id,
          name: "Delhi University",
          industry: "Education",
          website: "https://du.ac.in",
          notes: "High-value institutional subscription account.",
        },
        {
          organizationId: horizon.id,
          name: "Aster Biotech",
          industry: "Biotech",
          website: "https://aster.bio",
          notes: "Interested in multi-year enterprise package.",
        },
      ],
    });

    const northstarAccountList = await prisma.account.findMany({ where: { organizationId: northstar.id } });
    const horizonAccountList = await prisma.account.findMany({ where: { organizationId: horizon.id } });

    const [iitb, delhiUni] = northstarAccountList;
    const [aster] = horizonAccountList;

    const iitbContact = await prisma.contact.create({
      data: {
        organizationId: northstar.id,
        accountId: iitb.id,
        name: "Dr. Ramesh Kulkarni",
        role: "LIBRARIAN",
        title: "Head Librarian",
        email: "ramesh.kulkarni@iitb.ac.in",
        phone: "+91-22-2576-7011",
      },
    });

    const delhiContact = await prisma.contact.create({
      data: {
        organizationId: northstar.id,
        accountId: delhiUni.id,
        name: "Ananya Sen",
        role: "FINANCE",
        title: "Accounts Officer",
        email: "ananya.sen@du.ac.in",
        phone: "+91-11-2766-7854",
      },
    });

    const asterContact = await prisma.contact.create({
      data: {
        organizationId: horizon.id,
        accountId: aster.id,
        name: "Maya Shah",
        role: "PROCUREMENT",
        title: "Vendor Manager",
        email: "maya@aster.bio",
        phone: "+91-80-4000-1122",
      },
    });

    const northstarStages = await prisma.pipelineStage.findMany({
      where: { organizationId: northstar.id },
      orderBy: { sortOrder: "asc" },
    });
    const horizonStages = await prisma.pipelineStage.findMany({
      where: { organizationId: horizon.id },
      orderBy: { sortOrder: "asc" },
    });

    const [leadStage, discoveryStage] = northstarStages;
    const [hLeadStage] = horizonStages;

    const deal1 = await prisma.deal.create({
      data: {
        organizationId: northstar.id,
        accountId: iitb.id,
        contactId: iitbContact.id,
        stageId: leadStage.id,
        ownerId: owner.id,
        name: "2026 Institutional Renewal",
        value: 185000,
        currency: "INR",
        expectedClose: daysFromNow(21),
        nextActionAt: daysFromNow(2),
        notes: "Renewal call needed before dispatch schedule is finalized.",
      },
    });

    const deal2 = await prisma.deal.create({
      data: {
        organizationId: northstar.id,
        accountId: delhiUni.id,
        contactId: delhiContact.id,
        stageId: discoveryStage.id,
        ownerId: admin.id,
        name: "Proforma Subscription Expansion",
        value: 245000,
        currency: "INR",
        expectedClose: daysFromNow(14),
        nextActionAt: daysFromNow(1),
        notes: "Discuss journal bundle plus archive access.",
      },
    });

    const deal3 = await prisma.deal.create({
      data: {
        organizationId: horizon.id,
        accountId: aster.id,
        contactId: asterContact.id,
        stageId: hLeadStage.id,
        ownerId: admin.id,
        name: "Research Platform Pilot",
        value: 320000,
        currency: "INR",
        expectedClose: daysFromNow(30),
        nextActionAt: daysFromNow(3),
        notes: "Pilot proposal pending internal review.",
      },
    });

    const invoice1 = await prisma.invoice.create({
      data: {
        organizationId: northstar.id,
        accountId: iitb.id,
        dealId: deal1.id,
        createdById: owner.id,
        kind: "PROFORMA",
        invoiceNumber: "PF-2026-0001",
        recipientEmail: iitbContact.email,
        status: "SENT",
        issueDate: daysFromNow(-2),
        dueDate: daysFromNow(8),
        subtotal: 185000,
        tax: 0,
        total: 185000,
        currency: "INR",
        notes: "Shared after renewal call.",
      },
    });

    const invoice2 = await prisma.invoice.create({
      data: {
        organizationId: northstar.id,
        accountId: delhiUni.id,
        dealId: deal2.id,
        createdById: admin.id,
        kind: "INVOICE",
        invoiceNumber: "INV-2026-0002",
        recipientEmail: delhiContact.email,
        status: "OVERDUE",
        issueDate: daysFromNow(-20),
        dueDate: daysFromNow(-3),
        subtotal: 245000,
        tax: 0,
        total: 245000,
        currency: "INR",
        notes: "Overdue follow-up required.",
      },
    });

    await prisma.invoice.create({
      data: {
        organizationId: horizon.id,
        accountId: aster.id,
        dealId: deal3.id,
        createdById: admin.id,
        kind: "PROFORMA",
        invoiceNumber: "PF-2026-0003",
        recipientEmail: asterContact.email,
        status: "DRAFT",
        issueDate: daysFromNow(-1),
        dueDate: daysFromNow(12),
        subtotal: 320000,
        tax: 0,
        total: 320000,
        currency: "INR",
        notes: "Pending approval.",
      },
    });

    const task1 = await prisma.task.create({
      data: {
        organizationId: northstar.id,
        accountId: iitb.id,
        contactId: iitbContact.id,
        dealId: deal1.id,
        assignedToId: owner.id,
        title: "Call IIT Bombay for renewal confirmation",
        notes: "Discuss preferred shipping schedule and approval workflow.",
        dueAt: daysFromNow(0),
      },
    });

    await prisma.task.create({
      data: {
        organizationId: northstar.id,
        accountId: delhiUni.id,
        contactId: delhiContact.id,
        dealId: deal2.id,
        assignedToId: admin.id,
        title: "Send revised proforma to Delhi University",
        notes: "Attach payment instructions and dispatch timeline.",
        dueAt: daysFromNow(-1),
      },
    });

    await prisma.task.create({
      data: {
        organizationId: horizon.id,
        accountId: aster.id,
        contactId: asterContact.id,
        dealId: deal3.id,
        assignedToId: admin.id,
        title: "Schedule demo for Aster Biotech",
        notes: "Walk through reporting and automation modules.",
        dueAt: daysFromNow(2),
      },
    });

    await prisma.automationRule.createMany({
      data: [
        {
          organizationId: northstar.id,
          name: "Due task reminder",
          trigger: "TASK_DUE",
          channel: "EMAIL",
          delayDays: 0,
          subjectTemplate: "Reminder: {{taskTitle}}",
          bodyTemplate: "Follow up with {{accountName}} on {{dueDate}}.",
        },
        {
          organizationId: northstar.id,
          name: "Overdue invoice reminder",
          trigger: "INVOICE_OVERDUE",
          channel: "EMAIL",
          delayDays: 0,
          subjectTemplate: "Invoice {{invoiceNumber}} is overdue",
          bodyTemplate: "Please review the overdue payment for {{accountName}}.",
        },
        {
          organizationId: horizon.id,
          name: "Stage change alert",
          trigger: "DEAL_STAGE_CHANGED",
          channel: "IN_APP",
          delayDays: 0,
          subjectTemplate: "Deal moved stage",
          bodyTemplate: "{{dealName}} moved to {{stageName}}.",
        },
      ],
    });

    await prisma.notification.createMany({
      data: [
        {
          organizationId: northstar.id,
          userId: owner.id,
          type: "TASK_DUE",
          title: "Task due today",
          message: "Call IIT Bombay for renewal confirmation is due today.",
          taskId: task1.id,
        },
        {
          organizationId: northstar.id,
          userId: admin.id,
          type: "INVOICE_OVERDUE",
          title: "Overdue invoice",
          message: "Delhi University invoice is overdue and needs an immediate follow-up.",
        },
      ],
    });

    await prisma.emailLog.createMany({
      data: [
        {
          organizationId: northstar.id,
          invoiceId: invoice1.id,
          recipientEmail: iitbContact.email ?? "billing@iitb.ac.in",
          subject: "Your Northstar proforma is ready",
          body: "Hello, your proforma invoice has been prepared and shared for approval.",
          provider: "mock",
          status: "SENT",
          sentAt: daysFromNow(-2),
          relatedEntityType: "invoice",
          relatedEntityId: invoice1.id,
        },
        {
          organizationId: northstar.id,
          invoiceId: invoice2.id,
          recipientEmail: delhiContact.email ?? "accounts@du.ac.in",
          subject: "Invoice overdue reminder",
          body: "This is a reminder that the invoice is past due.",
          provider: "mock",
          status: "QUEUED",
          relatedEntityType: "invoice",
          relatedEntityId: invoice2.id,
        },
      ],
    });

    await prisma.auditEvent.createMany({
      data: [
        {
          organizationId: northstar.id,
          actorUserId: owner.id,
          action: "organization.seeded",
          entityType: "Organization",
          entityId: northstar.id,
          details: JSON.stringify({ accounts: 2, deals: 2, tasks: 2 }),
        },
        {
          organizationId: horizon.id,
          actorUserId: admin.id,
          action: "organization.seeded",
          entityType: "Organization",
          entityId: horizon.id,
          details: JSON.stringify({ accounts: 1, deals: 1, tasks: 1 }),
        },
      ],
    });
  })().finally(() => {
    seedingPromise = null;
  });

  return seedingPromise;
}

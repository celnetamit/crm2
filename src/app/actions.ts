"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAccountComment,
  completeTask,
  bulkUpdateAccounts,
  createAccount,
  createAutomationRule,
  createContact,
  createDeal,
  createInvoice,
  createOrganization,
  createTask,
  deleteAccount,
  deleteAccountComment,
  deleteAutomationRule,
  deleteContact,
  deleteDeal,
  deleteInvoice,
  deleteTask,
  importAccountsCsv,
  importContactsCsv,
  ensureWorkspaceDefaults,
  loginWithCredentials,
  logoutWorkspace,
  markNotificationRead,
  removeMember,
  runAutomationSweep,
  switchOrganization,
  sendTestEmail,
  sendAccountReviewReminders,
  updateAccount,
  updateAccountComment,
  updateAutomationRule,
  updateContact,
  updateDeal,
  updateDealStage,
  updateInvoice,
  updateInvoiceStatus,
  updateMemberRole,
  updateOrganization,
  updateTask,
} from "@/lib/crm";
import {
  acceptInvitation,
  inviteMember,
  requestPasswordReset,
  resetPassword,
  revokeInvitation,
} from "@/lib/onboarding";
import type {
  AutomationChannel,
  AutomationTrigger,
  DealStatus,
  InvoiceKind,
  InvoiceStatus,
  MembershipRole,
} from "@/generated/prisma";

function refreshWorkspace() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/deals");
  revalidatePath("/tasks");
  revalidatePath("/billing");
  revalidatePath("/automation");
  revalidatePath("/settings");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function optionalNumber(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function valuesFromFormData(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function buildCsvErrorReport(kind: "accounts" | "contacts", details: string[]) {
  if (details.length === 0) return null;

  const rows = ["row,message"];
  for (const detail of details) {
    const match = detail.match(/^Row\s+(\d+):\s*(.+)$/i);
    const row = match?.[1] ?? "";
    const message = (match?.[2] ?? detail).replace(/"/g, '""');
    rows.push(`${row},"${message}"`);
  }

  return {
    fileName: `${kind}-import-errors.csv`,
    csv: rows.join("\n"),
  };
}

export async function loginAction(_prevState: { error?: string; success?: boolean } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const result = await loginWithCredentials(email, password);
  if ("error" in result) return result;
  revalidatePath("/login");
  return { success: true };
}

export async function logoutAction() {
  await logoutWorkspace();
  redirect("/login");
}

export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!organizationId) return;
  const result = await switchOrganization(organizationId);
  if ("error" in result) return;
  refreshWorkspace();
}

export async function createOrganizationAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? ""));
  const industry = String(formData.get("industry") ?? "").trim();
  const timeZone = String(formData.get("timeZone") ?? "").trim();
  if (!name || !slug) return;

  await createOrganization({ name, slug, industry, timeZone });
  refreshWorkspace();
}

export async function updateOrganizationAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? ""));
  const industry = String(formData.get("industry") ?? "").trim();
  const timeZone = String(formData.get("timeZone") ?? "").trim();
  if (!name || !slug) return;

  await updateOrganization({ name, slug, industry, timeZone });
  refreshWorkspace();
}

export async function addMemberAction(formData: FormData) {
  return inviteMemberAction(null, formData);
}

export async function inviteMemberAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "MEMBER") as MembershipRole;
  if (!email || !name) {
    return { error: "Enter the member's name and email." };
  }

  let result;
  try {
    result = await inviteMember({
      email,
      name,
      role,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The invitation could not be created.",
    };
  }
  if ("error" in result) return result;

  refreshWorkspace();
  const deliveryStatus = result.delivery.status === "SENT" ? "Email sent." : "Invite created, but delivery failed.";
  return {
    success: `${name} was invited as ${role}. ${deliveryStatus}`,
  };
}

export async function revokeInvitationAction(formData: FormData) {
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) return;

  await revokeInvitation(invitationId);
  refreshWorkspace();
}

export async function updateMemberRoleAction(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "MEMBER") as MembershipRole;
  if (!membershipId) return;

  await updateMemberRole({ membershipId, role });
  refreshWorkspace();
}

export async function removeMemberAction(formData: FormData) {
  const membershipId = String(formData.get("membershipId") ?? "");
  if (!membershipId) return;

  await removeMember(membershipId);
  refreshWorkspace();
}

export async function sendTestEmailAction(
  _prevState: { error?: string; success?: string; provider?: string; status?: string; recipientEmail?: string } | null,
  formData: FormData,
) {
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!recipientEmail) {
    return { error: "Enter a recipient email address." };
  }

  const result = await sendTestEmail({
    recipientEmail,
    subject: subject || "CRM2 test email",
    body: body || "This is a CRM2 test email from your current provider.",
  });

  if (!result) {
    return { error: "Only owners and admins can send test emails." };
  }

  if (result.status === "FAILED") {
    return {
      error: result.errorMessage ?? "The test email could not be sent.",
      provider: result.provider,
      status: result.status,
      recipientEmail,
    };
  }

  return {
    success: `Test email sent to ${recipientEmail}.`,
    provider: result.provider,
    status: result.status,
    recipientEmail,
  };
}

export async function requestPasswordResetAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email address." };
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The reset link could not be created.",
    };
  }
  return {
    success: "If that email exists in CRM2, a reset link has been sent.",
  };
}

export async function acceptInvitationAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
) {
  const token = String(formData.get("token") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return { error: "This invitation link is missing its token." };
  }

  const result = await acceptInvitation({ token, name, password });
  if ("error" in result) {
    return { error: result.error };
  }

  return { success: "Invitation accepted. Redirecting to your workspace..." };
}

export async function resetPasswordAction(
  _prevState: { error?: string; success?: string } | null,
  formData: FormData,
) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "This reset link is missing its token." };
  }

  if (!password) {
    return { error: "Enter a new password." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const result = await resetPassword({ token, password });
  if ("error" in result) {
    return { error: result.error };
  }

  return { success: "Password updated. You can sign in with your new password now." };
}

export async function createAccountAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createAccount({
    name,
    ownerUserId: String(formData.get("ownerUserId") ?? "").trim() || undefined,
    industry: String(formData.get("industry") ?? "").trim() || undefined,
    website: String(formData.get("website") ?? "").trim() || undefined,
    status: String(formData.get("status") ?? "").trim() || undefined,
    lifecycleStage: String(formData.get("lifecycleStage") ?? "").trim() || undefined,
    segment: String(formData.get("segment") ?? "").trim() || undefined,
    source: String(formData.get("source") ?? "").trim() || undefined,
    tags: String(formData.get("tags") ?? "").trim() || undefined,
    profileSummary: String(formData.get("profileSummary") ?? "").trim() || undefined,
    headquarters: String(formData.get("headquarters") ?? "").trim() || undefined,
    companySize: String(formData.get("companySize") ?? "").trim() || undefined,
    annualRevenue: optionalNumber(formData.get("annualRevenue")),
    healthScore: optionalNumber(formData.get("healthScore")),
    nextReviewAt: String(formData.get("nextReviewAt") ?? "").trim() || undefined,
    customFields: String(formData.get("customFields") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function updateAccountAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!accountId || !name) return;

  await updateAccount({
    accountId,
    name,
    ownerUserId: String(formData.get("ownerUserId") ?? "").trim() || undefined,
    industry: String(formData.get("industry") ?? "").trim() || undefined,
    website: String(formData.get("website") ?? "").trim() || undefined,
    status: String(formData.get("status") ?? "").trim() || undefined,
    lifecycleStage: String(formData.get("lifecycleStage") ?? "").trim() || undefined,
    segment: String(formData.get("segment") ?? "").trim() || undefined,
    source: String(formData.get("source") ?? "").trim() || undefined,
    tags: String(formData.get("tags") ?? "").trim() || undefined,
    profileSummary: String(formData.get("profileSummary") ?? "").trim() || undefined,
    headquarters: String(formData.get("headquarters") ?? "").trim() || undefined,
    companySize: String(formData.get("companySize") ?? "").trim() || undefined,
    annualRevenue: optionalNumber(formData.get("annualRevenue")),
    healthScore: optionalNumber(formData.get("healthScore")),
    nextReviewAt: String(formData.get("nextReviewAt") ?? "").trim() || undefined,
    customFields: String(formData.get("customFields") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function bulkUpdateAccountsAction(formData: FormData) {
  const accountIds = formData
    .getAll("accountIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (accountIds.length === 0) return;

  await bulkUpdateAccounts({
    accountIds,
    applyOwnerChange: formData.get("applyOwnerChange") === "on",
    ownerUserId: String(formData.get("ownerUserId") ?? "").trim() || undefined,
    applyTagChange: formData.get("applyTagChange") === "on",
    tagMode: String(formData.get("tagMode") ?? "REPLACE") as "REPLACE" | "APPEND" | "REMOVE",
    tags: String(formData.get("tags") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function sendAccountReviewRemindersAction() {
  await sendAccountReviewReminders();
  refreshWorkspace();
}

export async function deleteAccountAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;

  await deleteAccount(accountId);
  refreshWorkspace();
}

export async function createContactAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!accountId || !name || !role) return;

  await createContact({
    accountId,
    name,
    role,
    title: String(formData.get("title") ?? "").trim() || undefined,
    department: String(formData.get("department") ?? "").trim() || undefined,
    influenceLevel: String(formData.get("influenceLevel") ?? "").trim() || undefined,
    preferredChannel: String(formData.get("preferredChannel") ?? "").trim() || undefined,
    linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function updateContactAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!contactId || !accountId || !name || !role) return;

  await updateContact({
    contactId,
    accountId,
    name,
    role,
    title: String(formData.get("title") ?? "").trim() || undefined,
    department: String(formData.get("department") ?? "").trim() || undefined,
    influenceLevel: String(formData.get("influenceLevel") ?? "").trim() || undefined,
    preferredChannel: String(formData.get("preferredChannel") ?? "").trim() || undefined,
    linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function deleteContactAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;

  await deleteContact(contactId);
  refreshWorkspace();
}

export async function createAccountCommentAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!accountId || !body) return;

  await createAccountComment({
    accountId,
    title: String(formData.get("title") ?? "").trim() || undefined,
    body,
    category: String(formData.get("category") ?? "").trim() || undefined,
    pinned: formData.get("pinned") === "on",
  });

  revalidatePath(`/accounts/${accountId}`);
  refreshWorkspace();
}

export async function deleteAccountCommentAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  if (!commentId) return;

  await deleteAccountComment(commentId);
  if (accountId) {
    revalidatePath(`/accounts/${accountId}`);
  }
  refreshWorkspace();
}

export async function updateAccountCommentAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!commentId || !accountId || !body) return;

  await updateAccountComment({
    commentId,
    title: String(formData.get("title") ?? "").trim() || undefined,
    body,
    category: String(formData.get("category") ?? "").trim() || undefined,
    pinned: formData.get("pinned") === "on",
  });

  revalidatePath(`/accounts/${accountId}`);
  refreshWorkspace();
}

export async function importAccountsCsvAction(
  _prevState: { error?: string; success?: string; details?: string[]; reportCsv?: string; reportFileName?: string } | null,
  formData: FormData,
) {
  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an accounts CSV file first." };
  }

  const result = await importAccountsCsv(await file.text());
  if (!result) {
    return { error: "Accounts import is only available to owners and admins." };
  }
  refreshWorkspace();
  const report = buildCsvErrorReport("accounts", result.errors);
  return {
    success: `Accounts import finished. Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}.`,
    details: result.errors.slice(0, 10),
    reportCsv: report?.csv,
    reportFileName: report?.fileName,
  };
}

export async function importContactsCsvAction(
  _prevState: { error?: string; success?: string; details?: string[]; reportCsv?: string; reportFileName?: string } | null,
  formData: FormData,
) {
  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a contacts CSV file first." };
  }

  const result = await importContactsCsv(await file.text());
  if (!result) {
    return { error: "Contacts import is only available to owners and admins." };
  }
  refreshWorkspace();
  const report = buildCsvErrorReport("contacts", result.errors);
  return {
    success: `Contacts import finished. Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}.`,
    details: result.errors.slice(0, 10),
    reportCsv: report?.csv,
    reportFileName: report?.fileName,
  };
}

export async function createDealAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  if (!accountId || !stageId || !name) return;

  await createDeal({
    accountId,
    contactId: String(formData.get("contactId") ?? "") || undefined,
    stageId,
    ownerId: String(formData.get("ownerId") ?? "") || undefined,
    name,
    value: Number.isFinite(value) ? value : 0,
    currency: String(formData.get("currency") ?? "").trim() || undefined,
    expectedClose: String(formData.get("expectedClose") ?? "").trim() || undefined,
    nextActionAt: String(formData.get("nextActionAt") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function updateDealAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const value = Number(formData.get("value") ?? 0);
  if (!dealId || !accountId || !stageId || !name) return;

  await updateDeal({
    dealId,
    accountId,
    contactId: String(formData.get("contactId") ?? "") || undefined,
    stageId,
    ownerId: String(formData.get("ownerId") ?? "") || undefined,
    name,
    value: Number.isFinite(value) ? value : 0,
    currency: String(formData.get("currency") ?? "").trim() || undefined,
    expectedClose: String(formData.get("expectedClose") ?? "").trim() || undefined,
    nextActionAt: String(formData.get("nextActionAt") ?? "").trim() || undefined,
    status: String(formData.get("status") ?? "OPEN") as DealStatus,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function deleteDealAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  if (!dealId) return;

  await deleteDeal(dealId);
  refreshWorkspace();
}

export async function updateDealStageAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const status = String(formData.get("status") ?? "OPEN") as DealStatus;
  if (!dealId || !stageId) return;
  await updateDealStage({ dealId, stageId, status });
  refreshWorkspace();
}

export async function createTaskAction(formData: FormData) {
  const assignedToId = String(formData.get("assignedToId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "");
  if (!assignedToId || !title || !dueAt) return;

  await createTask({
    accountId: String(formData.get("accountId") ?? "") || undefined,
    contactId: String(formData.get("contactId") ?? "") || undefined,
    dealId: String(formData.get("dealId") ?? "") || undefined,
    assignedToId,
    title,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    dueAt,
  });
  refreshWorkspace();
}

export async function updateTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const assignedToId = String(formData.get("assignedToId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "");
  if (!taskId || !assignedToId || !title || !dueAt) return;

  await updateTask({
    taskId,
    accountId: String(formData.get("accountId") ?? "") || undefined,
    contactId: String(formData.get("contactId") ?? "") || undefined,
    dealId: String(formData.get("dealId") ?? "") || undefined,
    assignedToId,
    title,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    dueAt,
    status: String(formData.get("status") ?? "PENDING"),
  });
  refreshWorkspace();
}

export async function deleteTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  await deleteTask(taskId);
  refreshWorkspace();
}

export async function completeTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;
  await completeTask(taskId, String(formData.get("notes") ?? "").trim() || undefined);
  refreshWorkspace();
}

export async function createInvoiceAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const kind = String(formData.get("kind") ?? "PROFORMA") as InvoiceKind;
  const status = String(formData.get("status") ?? "DRAFT") as InvoiceStatus;
  const subtotal = Number(formData.get("subtotal") ?? 0);
  if (!accountId) return;

  await createInvoice({
    accountId,
    dealId: String(formData.get("dealId") ?? "") || undefined,
    kind,
    recipientEmail: String(formData.get("recipientEmail") ?? "").trim() || undefined,
    status,
    dueDate: String(formData.get("dueDate") ?? "").trim() || undefined,
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    tax: Number(String(formData.get("tax") ?? 0)) || 0,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function updateInvoiceAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const kind = String(formData.get("kind") ?? "PROFORMA") as InvoiceKind;
  const status = String(formData.get("status") ?? "DRAFT") as InvoiceStatus;
  const subtotal = Number(formData.get("subtotal") ?? 0);
  if (!invoiceId || !accountId) return;

  await updateInvoice({
    invoiceId,
    accountId,
    dealId: String(formData.get("dealId") ?? "") || undefined,
    kind,
    recipientEmail: String(formData.get("recipientEmail") ?? "").trim() || undefined,
    status,
    dueDate: String(formData.get("dueDate") ?? "").trim() || undefined,
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    tax: Number(String(formData.get("tax") ?? 0)) || 0,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  refreshWorkspace();
}

export async function deleteInvoiceAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;

  await deleteInvoice(invoiceId);
  refreshWorkspace();
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const status = String(formData.get("status") ?? "DRAFT") as InvoiceStatus;
  if (!invoiceId) return;
  await updateInvoiceStatus({ invoiceId, status });
  refreshWorkspace();
}

export async function createAutomationRuleAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await createAutomationRule({
    name,
    trigger: String(formData.get("trigger") ?? "TASK_DUE") as AutomationTrigger,
    channel: String(formData.get("channel") ?? "EMAIL") as AutomationChannel,
    delayDays: Number(formData.get("delayDays") ?? 0) || 0,
    triggerValue: String(formData.get("triggerValue") ?? "").trim() || undefined,
    recipientRoles: valuesFromFormData(formData, "recipientRoles").join(",") || undefined,
    recipientUsers: valuesFromFormData(formData, "recipientUsers").join(",") || undefined,
    includeAccountOwners: formData.get("includeAccountOwners") === "on",
    subjectTemplate: String(formData.get("subjectTemplate") ?? "").trim(),
    bodyTemplate: String(formData.get("bodyTemplate") ?? "").trim(),
  });
  refreshWorkspace();
}

export async function updateAutomationRuleAction(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!ruleId || !name) return;

  await updateAutomationRule({
    ruleId,
    name,
    trigger: String(formData.get("trigger") ?? "TASK_DUE") as AutomationTrigger,
    channel: String(formData.get("channel") ?? "EMAIL") as AutomationChannel,
    active: formData.get("active") === "on",
    delayDays: Number(formData.get("delayDays") ?? 0) || 0,
    triggerValue: String(formData.get("triggerValue") ?? "").trim() || undefined,
    recipientRoles: valuesFromFormData(formData, "recipientRoles").join(",") || undefined,
    recipientUsers: valuesFromFormData(formData, "recipientUsers").join(",") || undefined,
    includeAccountOwners: formData.get("includeAccountOwners") === "on",
    subjectTemplate: String(formData.get("subjectTemplate") ?? "").trim(),
    bodyTemplate: String(formData.get("bodyTemplate") ?? "").trim(),
  });
  refreshWorkspace();
}

export async function deleteAutomationRuleAction(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!ruleId) return;

  await deleteAutomationRule(ruleId);
  refreshWorkspace();
}

export async function runAutomationSweepAction() {
  await runAutomationSweep();
  refreshWorkspace();
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return;
  await markNotificationRead(notificationId);
  refreshWorkspace();
}

export async function ensureDefaultsAction() {
  await ensureWorkspaceDefaults();
  refreshWorkspace();
}

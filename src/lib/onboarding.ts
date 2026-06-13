import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/env";
import { setSession, getSession, type SessionPayload } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import type { MembershipRole } from "@/generated/prisma";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60 * 2;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return randomBytes(32).toString("hex");
}

function canManageMembers(role: MembershipRole) {
  return role === "OWNER" || role === "ADMIN";
}

function buildInviteUrl(token: string) {
  return `${getAppUrl()}/invite?token=${encodeURIComponent(token)}`;
}

function buildResetUrl(token: string) {
  return `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

function fallbackName(email: string) {
  return email.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || email;
}

async function getWorkspaceContext() {
  const session = await getSession();
  if (!session) return null;

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.userId,
      organizationId: session.organizationId,
    },
    include: {
      organization: true,
      user: true,
    },
  });

  if (!membership) return null;

  return {
    session,
    membership,
    organizationId: membership.organizationId,
  };
}

async function setWorkspaceSession(user: { id: string; email: string; name: string }, membership: {
  role: MembershipRole;
  organizationId: string;
  organization: { name: string; slug: string };
}) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: membership.role,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    expiresAt: expiresAt.toISOString(),
  };

  await setSession(payload);
}

export async function inviteMember(input: {
  email: string;
  name?: string;
  role: MembershipRole;
}) {
  const workspace = await getWorkspaceContext();
  if (!workspace || !canManageMembers(workspace.membership.role)) {
    return { error: "Only owners and admins can invite members." };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (existingUser) {
    const existingMembership = await prisma.membership.findFirst({
      where: {
        organizationId: workspace.organizationId,
        userId: existingUser.id,
      },
      select: { id: true },
    });

    if (existingMembership) {
      return { error: "That user already belongs to this organization." };
    }
  }

  await prisma.invitation.updateMany({
    where: {
      organizationId: workspace.organizationId,
      email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  const token = makeToken();
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: workspace.organizationId,
      email,
      name,
      role: input.role,
      tokenHash: hashToken(token),
      invitedByUserId: workspace.session.userId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
    include: {
      organization: true,
    },
  });

  const inviteUrl = buildInviteUrl(token);
  const delivery = await sendEmail({
    to: email,
    subject: `You're invited to join ${invitation.organization.name} on CRM2`,
    body: [
      `Hi ${name ?? fallbackName(email)},`,
      "",
      `${workspace.session.name} invited you to join ${invitation.organization.name} on CRM2 as ${input.role}.`,
      "",
      `Accept your invitation: ${inviteUrl}`,
      "",
      "This invitation link expires in 7 days.",
    ].join("\n"),
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: workspace.organizationId,
      actorUserId: workspace.session.userId,
      action: "member.invited",
      entityType: "Invitation",
      entityId: invitation.id,
      details: JSON.stringify({
        email,
        role: input.role,
        deliveryStatus: delivery.status,
        errorMessage: delivery.errorMessage ?? undefined,
      }),
    },
  });

  return {
    invitation,
    delivery,
  };
}

export async function revokeInvitation(invitationId: string) {
  const workspace = await getWorkspaceContext();
  if (!workspace || !canManageMembers(workspace.membership.role)) return null;

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      organizationId: workspace.organizationId,
      acceptedAt: null,
      revokedAt: null,
    },
  });

  if (!invitation) return null;

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { revokedAt: new Date() },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: workspace.organizationId,
      actorUserId: workspace.session.userId,
      action: "member.invitation_revoked",
      entityType: "Invitation",
      entityId: invitation.id,
      details: JSON.stringify({ email: invitation.email }),
    },
  });

  return updated;
}

export async function getInvitationDetails(token: string) {
  const tokenHash = hashToken(token);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt < new Date()) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email.toLowerCase() },
    select: { id: true },
  });

  return {
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    organizationName: invitation.organization.name,
    existingUser: Boolean(existingUser),
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptInvitation(input: {
  token: string;
  name?: string;
  password?: string;
}) {
  const tokenHash = hashToken(input.token);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: {
      organization: true,
    },
  });

  if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt < new Date()) {
    return { error: "This invitation is invalid or has expired." };
  }

  const email = invitation.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        select: { id: true },
      },
    },
  });

  const password = input.password?.trim() ?? "";
  const name = input.name?.trim() || invitation.name || fallbackName(email);

  if (!existingUser && password.length < 12) {
    return { error: "Set a password with at least 12 characters." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const user =
      existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name,
              ...(password ? { passwordHash: hashPassword(password) } : {}),
            },
          })
        : await tx.user.create({
            data: {
              email,
              name,
              passwordHash: hashPassword(password),
            },
          });

    const membership = await tx.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
      },
      create: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
        isDefault: existingUser ? existingUser.memberships.length === 0 : true,
      },
      include: {
        organization: true,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: invitation.organizationId,
        actorUserId: user.id,
        action: "member.invitation_accepted",
        entityType: "Invitation",
        entityId: invitation.id,
        details: JSON.stringify({ email }),
      },
    });

    return { user, membership };
  });

  await setWorkspaceSession(result.user, result.membership);
  return { success: true };
}

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: true };
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const token = makeToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const resetUrl = buildResetUrl(token);
  await sendEmail({
    to: user.email,
    subject: "Reset your CRM2 password",
    body: [
      `Hi ${user.name},`,
      "",
      "We received a request to reset your CRM2 password.",
      "",
      `Reset your password: ${resetUrl}`,
      "",
      "This link expires in 2 hours.",
    ].join("\n"),
  });

  return { success: true };
}

export async function getPasswordResetDetails(token: string) {
  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return null;
  }

  return {
    email: resetToken.user.email,
    name: resetToken.user.name,
    expiresAt: resetToken.expiresAt,
  };
}

export async function resetPassword(input: { token: string; password: string }) {
  const password = input.password.trim();
  if (password.length < 12) {
    return { error: "Use a password with at least 12 characters." };
  }

  const tokenHash = hashToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: hashPassword(password),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
      },
    }),
  ]);

  return { success: true };
}

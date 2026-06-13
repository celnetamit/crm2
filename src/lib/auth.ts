import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionSecret } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import type { MembershipRole } from "@/generated/prisma";

const SESSION_COOKIE = "crm2_session";
const SECRET = getSessionSecret();
const KEY = Buffer.from(SECRET.padEnd(32, "0").slice(0, 32));

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: MembershipRole;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  expiresAt: string;
};

export async function encryptSession(payload: SessionPayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}:${cipher.getAuthTag().toString("hex")}`;
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const [ivHex, encryptedHex, authTagHex] = token.split(":");
    if (!ivHex || !encryptedHex || !authTagHex) return null;

    const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSession(payload: SessionPayload) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await encryptSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.expiresAt),
  });
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = await decryptSession(raw);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    await clearSession();
    return null;
  }

  return session;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function validateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!user) return null;
  const passwordOk = verifyPassword(password, user.passwordHash);
  if (!passwordOk) return null;

  const membership = user.memberships[0];
  if (!membership) return null;

  return {
    user,
    membership,
  };
}

export async function updateSessionOrganization(userId: string, organizationId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { organizationId },
        include: { organization: true },
      },
    },
  });

  const membership = user?.memberships[0];
  if (!user || !membership) return null;

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
  return payload;
}

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

function readArg(name: string) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : "";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const email = readArg("email").toLowerCase();
  const password = readArg("password");
  const name = readArg("name");
  const organizationName = readArg("org-name");
  const organizationSlug = slugify(readArg("org-slug") || organizationName);

  if (!email || !password || !name || !organizationName || !organizationSlug) {
    throw new Error(
      "Usage: npm run bootstrap:owner -- --email=owner@example.com --password='strong password' --name='Owner Name' --org-name='Workspace' [--org-slug=workspace]",
    );
  }

  if (password.length < 12) {
    throw new Error("Owner password must be at least 12 characters.");
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      role: "OWNER",
      organization: {
        slug: organizationSlug,
      },
    },
    include: {
      organization: true,
      user: true,
    },
  });

  if (existingMembership) {
    throw new Error(
      `Organization slug "${organizationSlug}" already has owner ${existingMembership.user.email}.`,
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const result = await prisma.$transaction(async (tx) => {
    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          email,
          name,
          passwordHash: hashPassword(password),
        },
      }));

    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug: organizationSlug,
      },
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
        isDefault: true,
      },
    });

    return { user, organization };
  });

  console.log(
    `Created owner ${result.user.email} for ${result.organization.name} (${result.organization.slug}).`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

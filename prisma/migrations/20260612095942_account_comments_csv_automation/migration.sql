-- AlterEnum
ALTER TYPE "public"."AutomationTrigger" ADD VALUE 'ACCOUNT_LIFECYCLE_CHANGED';

-- AlterTable
ALTER TABLE "public"."AutomationRule" ADD COLUMN     "triggerValue" TEXT;

-- CreateTable
CREATE TABLE "public"."AccountComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountComment_organizationId_accountId_createdAt_idx" ON "public"."AccountComment"("organizationId", "accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."AccountComment" ADD CONSTRAINT "AccountComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountComment" ADD CONSTRAINT "AccountComment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountComment" ADD CONSTRAINT "AccountComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

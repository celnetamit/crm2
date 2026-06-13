-- AlterTable
ALTER TABLE "public"."AutomationRule" ADD COLUMN     "includeAccountOwners" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recipientUsers" TEXT;

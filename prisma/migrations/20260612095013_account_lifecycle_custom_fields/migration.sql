-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "lifecycleStage" TEXT;

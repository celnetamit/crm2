-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "annualRevenue" DOUBLE PRECISION,
ADD COLUMN     "companySize" TEXT,
ADD COLUMN     "headquarters" TEXT,
ADD COLUMN     "healthScore" INTEGER,
ADD COLUMN     "nextReviewAt" TIMESTAMP(3),
ADD COLUMN     "profileSummary" TEXT,
ADD COLUMN     "segment" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "tags" TEXT;

-- AlterTable
ALTER TABLE "public"."Contact" ADD COLUMN     "department" TEXT,
ADD COLUMN     "influenceLevel" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "preferredChannel" TEXT;

ALTER TABLE "Account" ADD COLUMN "ownerUserId" TEXT;

CREATE INDEX "Account_organizationId_ownerUserId_idx" ON "Account"("organizationId", "ownerUserId");

ALTER TABLE "Account"
ADD CONSTRAINT "Account_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

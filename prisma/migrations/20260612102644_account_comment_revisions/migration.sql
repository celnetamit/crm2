CREATE TABLE "AccountCommentRevision" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "versionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountCommentRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountCommentRevision_commentId_versionNumber_key" ON "AccountCommentRevision"("commentId", "versionNumber");
CREATE INDEX "AccountCommentRevision_organizationId_commentId_createdAt_idx" ON "AccountCommentRevision"("organizationId", "commentId", "createdAt");

ALTER TABLE "AccountCommentRevision" ADD CONSTRAINT "AccountCommentRevision_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "AccountComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountCommentRevision" ADD CONSTRAINT "AccountCommentRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountCommentRevision" ADD CONSTRAINT "AccountCommentRevision_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

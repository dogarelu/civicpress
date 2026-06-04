-- Create Role enum
CREATE TYPE "Role" AS ENUM ('AUTHOR', 'EDITOR', 'ADMIN');

-- Create PostStatus enum  
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- Add new columns to Media
ALTER TABLE "Media" ADD COLUMN "ownerId" TEXT;

-- Add new auth columns to User (with defaults for existing rows)
ALTER TABLE "User" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'AUTHOR';
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make email unique (no duplicates in existing data after defaulting to '')
-- First update existing rows to have unique placeholder emails based on their id
UPDATE "User" SET "email" = 'legacy-' || "id" || '@civicpress.internal' WHERE "email" = '';
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Add new workflow columns to Post
ALTER TABLE "Post" ADD COLUMN "scheduledFor" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "submittedById" TEXT;
ALTER TABLE "Post" ADD COLUMN "approvedById" TEXT;

-- Convert Post.status from TEXT to PostStatus enum
-- First set all existing rows to PUBLISHED (they came from seed)
UPDATE "Post" SET "status" = 'PUBLISHED';

-- Add new enum column, copy data, drop old column
ALTER TABLE "Post" ADD COLUMN "statusNew" "PostStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "Post" SET "statusNew" = 'PUBLISHED';
ALTER TABLE "Post" DROP COLUMN "status";
ALTER TABLE "Post" RENAME COLUMN "statusNew" TO "status";

-- CreateTable Revision
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL,
    "editorId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Revision
CREATE INDEX "Revision_postId_createdAt_idx" ON "Revision"("postId", "createdAt");

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for AuditLog
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey Media.ownerId -> User.id
ALTER TABLE "Media" ADD CONSTRAINT "Media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old User->Media FK and re-add with named relation
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_avatarMediaId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old Post->User FK and re-add with new name support
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_authorId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Post.submittedById -> User.id
ALTER TABLE "Post" ADD CONSTRAINT "Post_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Post.approvedById -> User.id
ALTER TABLE "Post" ADD CONSTRAINT "Post_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Revision.postId -> Post.id
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Revision.editorId -> User.id
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey AuditLog.actorId -> User.id
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

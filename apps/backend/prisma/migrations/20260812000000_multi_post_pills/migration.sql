-- Multiple pills per post (join table), migrating from Post.pillId / Post.pillCorner.

CREATE TABLE "PostPill" (
    "postId" TEXT NOT NULL,
    "pillId" TEXT NOT NULL,
    "corner" TEXT,

    CONSTRAINT "PostPill_pkey" PRIMARY KEY ("postId","pillId")
);

-- Migrate existing single-pill assignments.
INSERT INTO "PostPill" ("postId", "pillId", "corner")
SELECT "id", "pillId", "pillCorner"
FROM "Post"
WHERE "pillId" IS NOT NULL;

-- Unique corner per post when corner is set (null allowed only for single-pill posts).
CREATE UNIQUE INDEX "PostPill_postId_corner_unique"
ON "PostPill" ("postId", "corner")
WHERE "corner" IS NOT NULL;

CREATE INDEX "PostPill_pillId_idx" ON "PostPill"("pillId");

ALTER TABLE "PostPill" ADD CONSTRAINT "PostPill_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostPill" ADD CONSTRAINT "PostPill_pillId_fkey"
FOREIGN KEY ("pillId") REFERENCES "Pill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy single-pill columns.
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_pillId_fkey";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "pillId";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "pillCorner";

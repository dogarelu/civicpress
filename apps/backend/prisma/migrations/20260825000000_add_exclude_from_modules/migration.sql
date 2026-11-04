-- AlterTable
ALTER TABLE "Post" ADD COLUMN "excludeFromModules" BOOLEAN NOT NULL DEFAULT false;

-- Existing articles created from a video-module URL should stay out of other modules.
UPDATE "Post"
SET "excludeFromModules" = true
WHERE id IN (
  SELECT DISTINCT "postId"
  FROM "Revision"
  WHERE message = 'Created from video URL'
);

ALTER TABLE "Post"
ADD COLUMN "showSummary" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Post"
SET "showSummary" = false;

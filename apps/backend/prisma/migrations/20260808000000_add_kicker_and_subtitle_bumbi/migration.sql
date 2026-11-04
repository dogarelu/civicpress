-- AlterTable: optional kicker (supratitlu) on posts
ALTER TABLE "Post" ADD COLUMN "kicker" TEXT;

-- PostBulb → subtitle bumbi: own id, required label, optional linked post
ALTER TABLE "PostBulb" DROP CONSTRAINT "PostBulb_pkey";
ALTER TABLE "PostBulb" DROP CONSTRAINT "PostBulb_linkedPostId_fkey";

ALTER TABLE "PostBulb" ADD COLUMN "id" TEXT;
ALTER TABLE "PostBulb" ADD COLUMN "label" TEXT;

UPDATE "PostBulb" AS b
SET
  "id" = md5(random()::text || clock_timestamp()::text || b."postId" || b."linkedPostId"),
  "label" = COALESCE(
    NULLIF(TRIM(b."labelOverride"), ''),
    (SELECT p."title" FROM "Post" p WHERE p."id" = b."linkedPostId"),
    'Bumb'
  );

ALTER TABLE "PostBulb" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "PostBulb" ALTER COLUMN "label" SET NOT NULL;
ALTER TABLE "PostBulb" ALTER COLUMN "linkedPostId" DROP NOT NULL;

ALTER TABLE "PostBulb" DROP COLUMN "labelOverride";

ALTER TABLE "PostBulb" ADD CONSTRAINT "PostBulb_pkey" PRIMARY KEY ("id");

ALTER TABLE "PostBulb" ADD CONSTRAINT "PostBulb_linkedPostId_fkey"
  FOREIGN KEY ("linkedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

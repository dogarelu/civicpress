ALTER TABLE "Post"
ADD COLUMN "authorName" TEXT;

UPDATE "Post" AS p
SET "authorName" = u."displayName"
FROM "User" AS u
WHERE p."authorId" = u."id"
  AND (p."authorName" IS NULL OR btrim(p."authorName") = '');

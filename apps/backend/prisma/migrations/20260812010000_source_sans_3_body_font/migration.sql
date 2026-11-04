-- Switch default body font to Source Sans 3 (has Black 900, unlike Open Sans).
ALTER TABLE "SiteSettings" ALTER COLUMN "bodyFont" SET DEFAULT 'Source Sans 3';

UPDATE "SiteSettings"
SET "bodyFont" = 'Source Sans 3'
WHERE "bodyFont" = 'Open Sans';

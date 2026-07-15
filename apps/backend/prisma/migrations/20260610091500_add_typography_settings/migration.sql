ALTER TABLE "SiteSettings"
ADD COLUMN "newsTitleFontWeight" INTEGER NOT NULL DEFAULT 700,
ADD COLUMN "newsSummaryFontSize" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN "newsSummaryFontWeight" INTEGER NOT NULL DEFAULT 400,
ADD COLUMN "heroTitleFontSize" INTEGER NOT NULL DEFAULT 28,
ADD COLUMN "heroTitleFontWeight" INTEGER NOT NULL DEFAULT 800,
ADD COLUMN "sidebarTitleFontSize" INTEGER NOT NULL DEFAULT 13,
ADD COLUMN "sidebarTitleFontWeight" INTEGER NOT NULL DEFAULT 600,
ADD COLUMN "articleTitleFontSize" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "articleTitleFontWeight" INTEGER NOT NULL DEFAULT 700,
ADD COLUMN "articleContentFontSize" INTEGER NOT NULL DEFAULT 17,
ADD COLUMN "articleContentFontWeight" INTEGER NOT NULL DEFAULT 400;

-- Preserve existing bold preference for list titles
UPDATE "SiteSettings"
SET "newsTitleFontWeight" = CASE WHEN "newsTitleFontBold" THEN 700 ELSE 400 END;

ALTER TABLE "SiteSettings" DROP COLUMN "newsTitleFontBold";

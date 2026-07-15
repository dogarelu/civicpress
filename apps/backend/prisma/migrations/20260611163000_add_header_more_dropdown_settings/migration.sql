ALTER TABLE "SiteSettings"
ADD COLUMN "headerShowMoreDropdown" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "headerMoreCategoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "showInMobileRow" BOOLEAN NOT NULL DEFAULT true;

-- Preserve current mobile visibility: the row starts as a copy of the burger-menu flag.
UPDATE "Category" SET "showInMobileRow" = "showInMobileMenu";

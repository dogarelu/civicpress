-- AlterTable
ALTER TABLE "Category" ADD COLUMN "showInMobileMenu" BOOLEAN NOT NULL DEFAULT true;

-- Preserve current menus: mobile starts as a copy of the web-menu flag.
UPDATE "Category" SET "showInMobileMenu" = "showInMenu";

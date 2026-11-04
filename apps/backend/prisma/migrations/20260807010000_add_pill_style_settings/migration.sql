-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "pillCorner" TEXT NOT NULL DEFAULT 'top-right';
ALTER TABLE "SiteSettings" ADD COLUMN "pillFontSize" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "SiteSettings" ADD COLUMN "pillTransparency" INTEGER NOT NULL DEFAULT 0;

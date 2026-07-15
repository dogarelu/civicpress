-- AlterTable
ALTER TABLE "Post" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "showArticleViews" BOOLEAN NOT NULL DEFAULT false;

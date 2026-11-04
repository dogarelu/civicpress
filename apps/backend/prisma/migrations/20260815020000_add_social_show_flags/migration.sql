-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "whatsappUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "tiktokUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "showFacebook" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "showTwitter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "showYoutube" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "showInstagram" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "showWhatsapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "showTiktok" BOOLEAN NOT NULL DEFAULT false;

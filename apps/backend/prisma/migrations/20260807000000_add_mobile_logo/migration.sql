-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "mobileLogoMediaId" TEXT;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_mobileLogoMediaId_fkey" FOREIGN KEY ("mobileLogoMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

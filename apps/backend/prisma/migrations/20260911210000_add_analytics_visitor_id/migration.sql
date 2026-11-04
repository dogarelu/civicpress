-- AlterTable
ALTER TABLE "AnalyticsSession" ADD COLUMN "visitorId" TEXT;

-- CreateIndex
CREATE INDEX "AnalyticsSession_visitorId_idx" ON "AnalyticsSession"("visitorId");

-- Simplify UTM to a single `utm=code` value (drop classic utm_* fields).
-- Feature is new; clear rows then reshape tables.

DELETE FROM "AnalyticsPageView";
DELETE FROM "AnalyticsSession";
DELETE FROM "UtmPreset";

-- UtmPreset: name/source/medium/... → code
DROP INDEX IF EXISTS "UtmPreset_name_idx";
ALTER TABLE "UtmPreset" DROP COLUMN "name";
ALTER TABLE "UtmPreset" DROP COLUMN "utmSource";
ALTER TABLE "UtmPreset" DROP COLUMN "utmMedium";
ALTER TABLE "UtmPreset" DROP COLUMN "utmCampaign";
ALTER TABLE "UtmPreset" DROP COLUMN "utmTerm";
ALTER TABLE "UtmPreset" DROP COLUMN "utmContent";
ALTER TABLE "UtmPreset" ADD COLUMN "code" TEXT NOT NULL;
CREATE UNIQUE INDEX "UtmPreset_code_key" ON "UtmPreset"("code");

-- AnalyticsSession
DROP INDEX IF EXISTS "AnalyticsSession_utmSource_utmMedium_utmCampaign_idx";
ALTER TABLE "AnalyticsSession" DROP COLUMN "utmSource";
ALTER TABLE "AnalyticsSession" DROP COLUMN "utmMedium";
ALTER TABLE "AnalyticsSession" DROP COLUMN "utmCampaign";
ALTER TABLE "AnalyticsSession" DROP COLUMN "utmTerm";
ALTER TABLE "AnalyticsSession" DROP COLUMN "utmContent";
ALTER TABLE "AnalyticsSession" ADD COLUMN "utm" TEXT;
CREATE INDEX "AnalyticsSession_utm_idx" ON "AnalyticsSession"("utm");

-- AnalyticsPageView
DROP INDEX IF EXISTS "AnalyticsPageView_utmSource_utmMedium_utmCampaign_startedAt_idx";
ALTER TABLE "AnalyticsPageView" DROP COLUMN "utmSource";
ALTER TABLE "AnalyticsPageView" DROP COLUMN "utmMedium";
ALTER TABLE "AnalyticsPageView" DROP COLUMN "utmCampaign";
ALTER TABLE "AnalyticsPageView" DROP COLUMN "utmTerm";
ALTER TABLE "AnalyticsPageView" DROP COLUMN "utmContent";
ALTER TABLE "AnalyticsPageView" ADD COLUMN "utm" TEXT;
CREATE INDEX "AnalyticsPageView_utm_startedAt_idx" ON "AnalyticsPageView"("utm", "startedAt");

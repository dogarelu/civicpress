-- CreateTable
CREATE TABLE "UtmPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "utmSource" TEXT NOT NULL,
    "utmMedium" TEXT NOT NULL,
    "utmCampaign" TEXT NOT NULL,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtmPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "utmPresetId" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsPageView" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "postId" TEXT,
    "title" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,

    CONSTRAINT "AnalyticsPageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UtmPreset_name_idx" ON "UtmPreset"("name");

-- CreateIndex
CREATE INDEX "AnalyticsSession_startedAt_idx" ON "AnalyticsSession"("startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_lastSeenAt_idx" ON "AnalyticsSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_utmSource_utmMedium_utmCampaign_idx" ON "AnalyticsSession"("utmSource", "utmMedium", "utmCampaign");

-- CreateIndex
CREATE INDEX "AnalyticsPageView_sessionId_idx" ON "AnalyticsPageView"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsPageView_path_startedAt_idx" ON "AnalyticsPageView"("path", "startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsPageView_postId_startedAt_idx" ON "AnalyticsPageView"("postId", "startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsPageView_pageType_startedAt_idx" ON "AnalyticsPageView"("pageType", "startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsPageView_startedAt_idx" ON "AnalyticsPageView"("startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsPageView_utmSource_utmMedium_utmCampaign_startedAt_idx" ON "AnalyticsPageView"("utmSource", "utmMedium", "utmCampaign", "startedAt");

-- AddForeignKey
ALTER TABLE "AnalyticsPageView" ADD CONSTRAINT "AnalyticsPageView_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

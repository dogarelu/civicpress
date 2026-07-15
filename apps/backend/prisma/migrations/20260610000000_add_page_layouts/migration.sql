-- CreateTable
CREATE TABLE "PageLayout" (
    "id" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageLayout_pkey" PRIMARY KEY ("id")
);

-- DropTable (replaced by PageLayout)
DROP TABLE IF EXISTS "HomepageSlot";
DROP TABLE IF EXISTS "LayoutSetting";

-- DropEnum
DROP TYPE IF EXISTS "HomepageSlotType";

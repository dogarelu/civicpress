-- CreateEnum
CREATE TYPE "HomepageSlotType" AS ENUM ('HERO', 'GRID', 'LIST');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP DEFAULT,
ALTER COLUMN "passwordHash" DROP DEFAULT;

-- CreateTable
CREATE TABLE "HomepageSlot" (
    "id" TEXT NOT NULL,
    "slotType" "HomepageSlotType" NOT NULL,
    "position" INTEGER NOT NULL,
    "postId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "HomepageSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSlot_slotType_position_key" ON "HomepageSlot"("slotType", "position");

-- AddForeignKey
ALTER TABLE "HomepageSlot" ADD CONSTRAINT "HomepageSlot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepageSlot" ADD CONSTRAINT "HomepageSlot_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

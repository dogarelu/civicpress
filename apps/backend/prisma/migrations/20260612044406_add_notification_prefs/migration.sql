-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationEmail" TEXT,
ADD COLUMN     "notifyReviewEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyReviewSignal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signalNumber" TEXT;

-- CreateTable
CREATE TABLE "Pill" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pill_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "pillId" TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_pillId_fkey" FOREIGN KEY ("pillId") REFERENCES "Pill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

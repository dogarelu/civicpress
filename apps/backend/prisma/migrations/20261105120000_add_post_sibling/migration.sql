-- AlterTable
ALTER TABLE "Post" ADD COLUMN "siblingPostId" TEXT;

-- CreateIndex
CREATE INDEX "Post_siblingPostId_idx" ON "Post"("siblingPostId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_siblingPostId_fkey" FOREIGN KEY ("siblingPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

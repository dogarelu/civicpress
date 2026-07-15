-- CreateTable
CREATE TABLE "PostBulb" (
    "postId" TEXT NOT NULL,
    "linkedPostId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "labelOverride" TEXT,

    CONSTRAINT "PostBulb_pkey" PRIMARY KEY ("postId","linkedPostId")
);

-- CreateIndex
CREATE INDEX "PostBulb_postId_sortOrder_idx" ON "PostBulb"("postId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PostBulb" ADD CONSTRAINT "PostBulb_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostBulb" ADD CONSTRAINT "PostBulb_linkedPostId_fkey" FOREIGN KEY ("linkedPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

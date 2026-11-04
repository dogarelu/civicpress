-- Per-photo captions on articles (applied in document order)
CREATE TABLE "PostPhotoCaption" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "PostPhotoCaption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostPhotoCaption_postId_sortOrder_idx" ON "PostPhotoCaption"("postId", "sortOrder");

ALTER TABLE "PostPhotoCaption" ADD CONSTRAINT "PostPhotoCaption_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

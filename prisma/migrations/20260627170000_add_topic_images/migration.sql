-- CreateTable
CREATE TABLE "public"."TopicImage" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopicImage_topicId_sortOrder_idx" ON "public"."TopicImage"("topicId", "sortOrder");

-- CreateIndex
CREATE INDEX "TopicImage_userId_idx" ON "public"."TopicImage"("userId");

-- AddForeignKey
ALTER TABLE "public"."TopicImage" ADD CONSTRAINT "TopicImage_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicImage" ADD CONSTRAINT "TopicImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

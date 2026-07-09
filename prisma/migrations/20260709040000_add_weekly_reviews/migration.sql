CREATE TABLE "public"."WeeklyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "movedForward" TEXT,
    "busyNotUseful" TEXT,
    "moreNextWeek" TEXT,
    "lessNextWeek" TEXT,
    "taskChanges" TEXT,
    "routineAligned" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyReview_userId_weekStart_key" ON "public"."WeeklyReview"("userId", "weekStart");
CREATE INDEX "WeeklyReview_userId_completedAt_idx" ON "public"."WeeklyReview"("userId", "completedAt");

ALTER TABLE "public"."WeeklyReview" ADD CONSTRAINT "WeeklyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

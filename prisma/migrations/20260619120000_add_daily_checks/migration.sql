-- CreateEnum
CREATE TYPE "DailyCheckStatus" AS ENUM ('YES', 'NO', 'SKIP', 'UNSURE');

-- CreateTable
CREATE TABLE "DailyCheck" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckResult" (
    "id" TEXT NOT NULL,
    "dailyCheckId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetDay" TIMESTAMP(3) NOT NULL,
    "status" "DailyCheckStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReviewDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetDay" TIMESTAMP(3) NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReviewDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCheck_userId_isActive_sortOrder_idx" ON "DailyCheck"("userId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckResult_dailyCheckId_targetDay_key" ON "DailyCheckResult"("dailyCheckId", "targetDay");

-- CreateIndex
CREATE INDEX "DailyCheckResult_userId_targetDay_idx" ON "DailyCheckResult"("userId", "targetDay");

-- CreateIndex
CREATE INDEX "DailyCheckResult_status_targetDay_idx" ON "DailyCheckResult"("status", "targetDay");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReviewDismissal_userId_targetDay_key" ON "DailyReviewDismissal"("userId", "targetDay");

-- CreateIndex
CREATE INDEX "DailyReviewDismissal_userId_dismissedAt_idx" ON "DailyReviewDismissal"("userId", "dismissedAt");

-- AddForeignKey
ALTER TABLE "DailyCheck" ADD CONSTRAINT "DailyCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckResult" ADD CONSTRAINT "DailyCheckResult_dailyCheckId_fkey" FOREIGN KEY ("dailyCheckId") REFERENCES "DailyCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckResult" ADD CONSTRAINT "DailyCheckResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReviewDismissal" ADD CONSTRAINT "DailyReviewDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

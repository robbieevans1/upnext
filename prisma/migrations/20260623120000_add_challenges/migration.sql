CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDay" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyCheckId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Challenge_dailyCheckId_key" ON "Challenge"("dailyCheckId");
CREATE INDEX "Challenge_userId_isActive_startDay_idx" ON "Challenge"("userId", "isActive", "startDay");

ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_dailyCheckId_fkey" FOREIGN KEY ("dailyCheckId") REFERENCES "DailyCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

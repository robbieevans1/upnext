-- CreateTable
CREATE TABLE "DowntimeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DowntimeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DowntimeSession_userId_day_idx" ON "DowntimeSession"("userId", "day");

-- CreateIndex
CREATE INDEX "DowntimeSession_userId_stoppedAt_idx" ON "DowntimeSession"("userId", "stoppedAt");

-- AddForeignKey
ALTER TABLE "DowntimeSession" ADD CONSTRAINT "DowntimeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

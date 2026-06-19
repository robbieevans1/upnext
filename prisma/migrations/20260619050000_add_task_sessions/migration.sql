-- CreateTable
CREATE TABLE "TaskSession" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskSession_userId_day_idx" ON "TaskSession"("userId", "day");

-- CreateIndex
CREATE INDEX "TaskSession_userId_stoppedAt_idx" ON "TaskSession"("userId", "stoppedAt");

-- CreateIndex
CREATE INDEX "TaskSession_taskId_day_idx" ON "TaskSession"("taskId", "day");

-- AddForeignKey
ALTER TABLE "TaskSession" ADD CONSTRAINT "TaskSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSession" ADD CONSTRAINT "TaskSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

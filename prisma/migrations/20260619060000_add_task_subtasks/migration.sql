-- CreateTable
CREATE TABLE "TaskSubtask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stackOrder" INTEGER NOT NULL DEFAULT 0,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtaskCompletion" (
    "id" TEXT NOT NULL,
    "subtaskId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubtaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskSubtask_taskId_stackOrder_idx" ON "TaskSubtask"("taskId", "stackOrder");

-- CreateIndex
CREATE INDEX "TaskSubtask_userId_isActive_idx" ON "TaskSubtask"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubtaskCompletion_subtaskId_completedOn_key" ON "SubtaskCompletion"("subtaskId", "completedOn");

-- CreateIndex
CREATE INDEX "SubtaskCompletion_taskId_completedOn_idx" ON "SubtaskCompletion"("taskId", "completedOn");

-- CreateIndex
CREATE INDEX "SubtaskCompletion_userId_completedOn_idx" ON "SubtaskCompletion"("userId", "completedOn");

-- AddForeignKey
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtaskCompletion" ADD CONSTRAINT "SubtaskCompletion_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "TaskSubtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtaskCompletion" ADD CONSTRAINT "SubtaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtaskCompletion" ADD CONSTRAINT "SubtaskCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

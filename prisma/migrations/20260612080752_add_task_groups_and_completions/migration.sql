/*
  Warnings:

  - You are about to drop the column `priority` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `recurrence` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `TaskCompletion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[taskId,completedOn]` on the table `TaskCompletion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `completedOn` to the `TaskCompletion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `TaskCompletion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "TaskCompletion_taskId_completedAt_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "priority",
DROP COLUMN "recurrence",
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "stackOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TaskCompletion" DROP COLUMN "completedAt",
ADD COLUMN     "completedOn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCompletion_userId_completedOn_idx" ON "TaskCompletion"("userId", "completedOn");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCompletion_taskId_completedOn_key" ON "TaskCompletion"("taskId", "completedOn");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TaskGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroup" ADD CONSTRAINT "TaskGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

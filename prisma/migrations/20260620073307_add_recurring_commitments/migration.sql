-- CreateEnum
CREATE TYPE "CommitmentRecurrence" AS ENUM ('NONE', 'WEEKLY');

-- AlterTable
ALTER TABLE "Commitment" ADD COLUMN     "recurrence" "CommitmentRecurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "recurrenceDayOfWeek" INTEGER;

-- CreateTable
CREATE TABLE "CommitmentOccurrenceCompletion" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurrenceDay" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitmentOccurrenceCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommitmentOccurrenceCompletion_userId_occurrenceDay_idx" ON "CommitmentOccurrenceCompletion"("userId", "occurrenceDay");

-- CreateIndex
CREATE UNIQUE INDEX "CommitmentOccurrenceCompletion_commitmentId_occurrenceDay_key" ON "CommitmentOccurrenceCompletion"("commitmentId", "occurrenceDay");

-- CreateIndex
CREATE INDEX "Commitment_userId_recurrence_recurrenceDayOfWeek_idx" ON "Commitment"("userId", "recurrence", "recurrenceDayOfWeek");

-- AddForeignKey
ALTER TABLE "CommitmentOccurrenceCompletion" ADD CONSTRAINT "CommitmentOccurrenceCompletion_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "Commitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitmentOccurrenceCompletion" ADD CONSTRAINT "CommitmentOccurrenceCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

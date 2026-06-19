-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "playbook" TEXT,
    "dueOn" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "playbook" TEXT,
    "location" TEXT,
    "day" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionItem_userId_dueOn_idx" ON "ActionItem"("userId", "dueOn");

-- CreateIndex
CREATE INDEX "ActionItem_userId_completedAt_idx" ON "ActionItem"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "ActionItem_userId_canceledAt_idx" ON "ActionItem"("userId", "canceledAt");

-- CreateIndex
CREATE INDEX "Commitment_userId_day_idx" ON "Commitment"("userId", "day");

-- CreateIndex
CREATE INDEX "Commitment_userId_startsAt_idx" ON "Commitment"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "Commitment_userId_completedAt_idx" ON "Commitment"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "Commitment_userId_canceledAt_idx" ON "Commitment"("userId", "canceledAt");

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

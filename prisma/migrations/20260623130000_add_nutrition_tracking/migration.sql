CREATE TABLE "CalorieEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "calories" INTEGER NOT NULL,
    "note" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalorieEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "weightLbs" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalorieEntry_userId_day_idx" ON "CalorieEntry"("userId", "day");
CREATE INDEX "CalorieEntry_userId_loggedAt_idx" ON "CalorieEntry"("userId", "loggedAt");
CREATE UNIQUE INDEX "WeightEntry_userId_day_key" ON "WeightEntry"("userId", "day");
CREATE INDEX "WeightEntry_userId_day_idx" ON "WeightEntry"("userId", "day");

ALTER TABLE "CalorieEntry" ADD CONSTRAINT "CalorieEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

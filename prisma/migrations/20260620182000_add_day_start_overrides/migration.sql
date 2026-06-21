CREATE TABLE "DayStartOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseDay" TIMESTAMP(3) NOT NULL,
    "targetDay" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayStartOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayStartOverride_userId_key" ON "DayStartOverride"("userId");
CREATE INDEX "DayStartOverride_expiresAt_idx" ON "DayStartOverride"("expiresAt");

ALTER TABLE "DayStartOverride" ADD CONSTRAINT "DayStartOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

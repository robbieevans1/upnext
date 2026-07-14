CREATE TABLE "public"."TaskSkip" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skippedOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSkip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskSkip_taskId_skippedOn_key" ON "public"."TaskSkip"("taskId", "skippedOn");
CREATE INDEX "TaskSkip_userId_skippedOn_idx" ON "public"."TaskSkip"("userId", "skippedOn");

ALTER TABLE "public"."TaskSkip" ADD CONSTRAINT "TaskSkip_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TaskSkip" ADD CONSTRAINT "TaskSkip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

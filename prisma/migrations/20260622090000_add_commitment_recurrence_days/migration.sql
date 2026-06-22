ALTER TABLE "Commitment" ADD COLUMN "recurrenceDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "Commitment"
SET "recurrenceDays" = ARRAY["recurrenceDayOfWeek"]
WHERE "recurrence" = 'WEEKLY'
  AND "recurrenceDayOfWeek" IS NOT NULL
  AND cardinality("recurrenceDays") = 0;

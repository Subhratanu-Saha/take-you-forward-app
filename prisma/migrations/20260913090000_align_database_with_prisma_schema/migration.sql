-- AlterTable loyaltyledger
ALTER TABLE "loyaltyledger"
  ADD COLUMN IF NOT EXISTS "eventid" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "updatedat" TIMESTAMP(6),
  ALTER COLUMN "points" TYPE NUMERIC(10, 0) USING "points"::NUMERIC;

CREATE UNIQUE INDEX IF NOT EXISTS "loyaltyledger_eventid_key" ON "loyaltyledger"("eventid");

-- AlterTable auditlog
ALTER TABLE "auditlog"
  DROP COLUMN IF EXISTS "newvalue",
  ALTER COLUMN "entitytype" DROP NOT NULL,
  ALTER COLUMN "entityname" SET NOT NULL;

-- Keep the database column aligned with prisma/schema.prisma.
ALTER TABLE "loyalty"
  ALTER COLUMN "totalpoints" TYPE NUMERIC(10, 0)
  USING "totalpoints"::NUMERIC;
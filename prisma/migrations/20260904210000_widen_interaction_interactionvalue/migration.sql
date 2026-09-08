-- Keep the database column aligned with prisma/schema.prisma.
ALTER TABLE "interaction"
  ALTER COLUMN "interactionvalue" TYPE VARCHAR(100);

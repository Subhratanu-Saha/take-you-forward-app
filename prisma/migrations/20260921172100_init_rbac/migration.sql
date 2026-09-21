-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_AGENT', 'AUDITOR', 'MARKETING_USER');

-- CreateTable
CREATE TABLE "role" (
    "roleid" VARCHAR(40) NOT NULL,
    "name" "RoleType" NOT NULL,
    "description" VARCHAR(255),
    "createdat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(6),

    CONSTRAINT "role_pkey" PRIMARY KEY ("roleid")
);

-- CreateTable
CREATE TABLE "user" (
    "userid" VARCHAR(40) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "roleid" VARCHAR(40) NOT NULL,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("userid")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_roleid_idx" ON "user"("roleid");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_roleid_fkey" FOREIGN KEY ("roleid") REFERENCES "role"("roleid") ON DELETE RESTRICT ON UPDATE CASCADE;

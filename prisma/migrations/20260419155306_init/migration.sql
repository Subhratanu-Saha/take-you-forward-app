-- CreateTable
CREATE TABLE "customer" (
    "customerid" VARCHAR(20) NOT NULL,
    "firstname" VARCHAR(50) NOT NULL,
    "lastname" VARCHAR(50),
    "emailadd" VARCHAR(100) NOT NULL,
    "contactnum" VARCHAR(20),
    "addressline1" VARCHAR(100) NOT NULL,
    "addressline2" VARCHAR(100),
    "city" VARCHAR(30) NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "gender" VARCHAR(1),
    "dob" DATE NOT NULL,
    "isloyalty" BOOLEAN,
    "sysenrollmentdt" TIMESTAMP(6),
    "syslastmodifieddt" TIMESTAMP(6),

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customerid")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_emailadd_key" ON "customer"("emailadd");

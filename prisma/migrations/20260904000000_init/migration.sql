-- =============================================================
-- Baseline migration: full schema as it existed before Prisma
-- was introduced. This allows `prisma migrate dev` to replay
-- the full migration history from scratch on a blank database
-- (e.g. shadow DB, CI, or new dev environments).
-- =============================================================

-- CreateTable customer
CREATE TABLE "customer" (
    "customerid"        VARCHAR(40)   NOT NULL,
    "firstname"         VARCHAR(50)   NOT NULL,
    "lastname"          VARCHAR(50),
    "emailadd"          VARCHAR(100)  NOT NULL,
    "contactnum"        VARCHAR(20),
    "addressline1"      VARCHAR(100)  NOT NULL,
    "addressline2"      VARCHAR(100),
    "city"              VARCHAR(30)   NOT NULL,
    "pincode"           VARCHAR(10)   NOT NULL,
    "gender"            VARCHAR(1),
    "dob"               DATE          NOT NULL,
    "isloyalty"         BOOLEAN,
    "sysenrollmentdt"   TIMESTAMP(6),
    "syslastmodifieddt" TIMESTAMP(6),

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customerid")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_emailadd_key" ON "customer"("emailadd");

-- CreateTable interaction
CREATE TABLE "interaction" (
    "interactionid"     VARCHAR(40)   NOT NULL,
    "customerid"        VARCHAR(40),
    "interactionmode"   VARCHAR(20)   NOT NULL,
    "interactionvalue"  VARCHAR(100)  NOT NULL,
    "interactiontype"   VARCHAR(40)   NOT NULL,
    "syslastmodifieddt" TIMESTAMP(6),

    CONSTRAINT "interaction_pkey" PRIMARY KEY ("interactionid")
);

-- AddForeignKey
ALTER TABLE "interaction"
    ADD CONSTRAINT "interaction_customerid_fkey"
    FOREIGN KEY ("customerid") REFERENCES "customer"("customerid")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable loyalty
CREATE TABLE "loyalty" (
    "loyaltyid"      SERIAL         NOT NULL,
    "customerid"     VARCHAR(40),
    "totalpoints"    NUMERIC(10, 0),
    "tier"           VARCHAR(15)    NOT NULL,
    "isactive"       BOOLEAN        NOT NULL,
    "lastearnedat"   TIMESTAMP(6)   NOT NULL,
    "lastredeemedat" TIMESTAMP(6)   NOT NULL,
    "createdat"      TIMESTAMP(6)   NOT NULL,
    "updatedat"      TIMESTAMP(6),

    CONSTRAINT "loyalty_pkey" PRIMARY KEY ("loyaltyid")
);

-- AddForeignKey
ALTER TABLE "loyalty"
    ADD CONSTRAINT "loyalty_customerid_fkey"
    FOREIGN KEY ("customerid") REFERENCES "customer"("customerid")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable loyaltyledger
CREATE TABLE "loyaltyledger" (
    "ledgerid"     SERIAL         NOT NULL,
    "customerid"   VARCHAR(40),
    "orderid"      VARCHAR(40)    NOT NULL,
    "eventid"      VARCHAR(255),
    "ledgertype"   VARCHAR(20),
    "points"       NUMERIC(10, 0),
    "balanceafter" INTEGER,
    "expirydate"   TIMESTAMP(6),
    "createdat"    TIMESTAMP(6),
    "updatedat"    TIMESTAMP(6),

    CONSTRAINT "loyaltyledger_pkey" PRIMARY KEY ("ledgerid")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyaltyledger_eventid_key" ON "loyaltyledger"("eventid");

-- AddForeignKey
ALTER TABLE "loyaltyledger"
    ADD CONSTRAINT "loyaltyledger_customerid_fkey"
    FOREIGN KEY ("customerid") REFERENCES "customer"("customerid")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable orderheader
CREATE TABLE "orderheader" (
    "orderid"           VARCHAR(40)   NOT NULL,
    "customerid"        VARCHAR(40),
    "totalamount"       NUMERIC(10, 2) NOT NULL,
    "taxamount"         NUMERIC(10, 2),
    "channel"           VARCHAR(10),
    "payment"           VARCHAR(10)   NOT NULL,
    "discount"          NUMERIC(10, 2),
    "isloyalty"         BOOLEAN,
    "syslastmodifieddt" TIMESTAMP(6),

    CONSTRAINT "orderheader_pkey" PRIMARY KEY ("orderid")
);

-- AddForeignKey
ALTER TABLE "orderheader"
    ADD CONSTRAINT "orderheader_customerid_fkey"
    FOREIGN KEY ("customerid") REFERENCES "customer"("customerid")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable orderlineitems
CREATE TABLE "orderlineitems" (
    "orderitemid" VARCHAR(40)    NOT NULL,
    "orderid"     VARCHAR(40),
    "skuid"       VARCHAR(40)    NOT NULL,
    "skuitem"     VARCHAR(200)   NOT NULL,
    "skuquantity" VARCHAR(3)     NOT NULL,
    "skuprice"    NUMERIC(10, 2) NOT NULL,

    CONSTRAINT "orderlineitems_pkey" PRIMARY KEY ("orderitemid")
);

-- AddForeignKey
ALTER TABLE "orderlineitems"
    ADD CONSTRAINT "orderlineitems_orderid_fkey"
    FOREIGN KEY ("orderid") REFERENCES "orderheader"("orderid")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable subscriber
CREATE TABLE "subscriber" (
    "subscriberid"    VARCHAR(40)  NOT NULL,
    "customerid"      VARCHAR(40),
    "issubscribe"     BOOLEAN      NOT NULL,
    "emailpermstatus" BOOLEAN      NOT NULL,
    "smspermstatus"   BOOLEAN      NOT NULL,
    "sysmodifieddt"   TIMESTAMP(6),

    CONSTRAINT "subscriber_pkey" PRIMARY KEY ("subscriberid")
);

-- AddForeignKey
ALTER TABLE "subscriber"
    ADD CONSTRAINT "subscriber_customerid_fkey"
    FOREIGN KEY ("customerid") REFERENCES "customer"("customerid")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable promotionaldlq
CREATE TABLE "promotionaldlq" (
    "eventid"       VARCHAR(60)   NOT NULL,
    "customerid"    VARCHAR(40),
    "emailaddress"  VARCHAR(100),
    "subject"       VARCHAR(200),
    "payload"       JSONB,
    "errormessage"  TEXT,
    "attemptcount"  INTEGER       NOT NULL DEFAULT 0,
    "status"        VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    "createdat"     TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat"     TIMESTAMP(6),
    "lastattemptat" TIMESTAMP(6),
    "nextretryat"   TIMESTAMP(6),

    CONSTRAINT "promotionaldlq_pkey" PRIMARY KEY ("eventid")
);

-- CreateTable auditlog
CREATE TABLE "auditlog" (
    "auditid"        VARCHAR(40)   NOT NULL,
    "entityname"     VARCHAR(50)   NOT NULL,
    "entitytype"     VARCHAR(50),
    "entityid"       VARCHAR(100)  NOT NULL,
    "action"         VARCHAR(50)   NOT NULL,
    "customerid"     VARCHAR(40),
    "oldvalues"      JSONB,
    "newvalues"      JSONB,
    "changedfields"  JSONB,
    "metadata"       JSONB,
    "requestid"      VARCHAR(100),
    "actor"          VARCHAR(100),
    "ipaddress"      VARCHAR(50),
    "createdby"      VARCHAR(100)  NOT NULL DEFAULT 'SYSTEM',
    "createdby_type" VARCHAR(50)   NOT NULL DEFAULT 'AUTOMATED',
    "createdat"      TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat"      TIMESTAMP(6),

    CONSTRAINT "auditlog_pkey" PRIMARY KEY ("auditid")
);

-- CreateIndex
CREATE INDEX "auditlog_entityname_entityid_idx" ON "auditlog"("entityname", "entityid");

-- CreateIndex
CREATE INDEX "auditlog_requestid_idx" ON "auditlog"("requestid");

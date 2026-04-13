 # TUFDB — Postgres Schema & Setup

 This document is the canonical source for **TUFDB** database creation and schema execution. It includes:
 - Where to execute the SQL
 - How to execute it (pgAdmin + psql)
 - The full schema creation script
 - Visual ER diagrams for quick onboarding

 ---

 ## ✅ Quick glossary (SQL basics)
 - **READ** → `SELECT`
 - **INSERT** → `INSERT`
 - **UPDATE** → `UPDATE`
 - **DELETE** → `DELETE`
 - **Create infra** → `CREATE` (database/table)
 - **Modify infra** → `ALTER`
 - **Drop infra** → `DROP`

 ---

 ## 🧰 Local pgAdmin setup (Windows)
 1. Install **PostgreSQL** (includes pgAdmin 4).
 2. Open **pgAdmin 4** from the Start menu.
 3. In pgAdmin, register your local server:
		- **Host**: `localhost`
		- **Port**: `5432`
		- **Maintenance DB**: `postgres`
		- **Username**: your local Postgres user (often `postgres`)
		- **Password**: the password you set during installation

 ---

 ## 🗄️ Create the database (TUFDB)
 **Where to execute:**
 - pgAdmin → right-click your server → **Query Tool** → run the SQL below **against the `postgres` maintenance DB**.

 ```sql
 CREATE DATABASE "TUFDB";
 ```

 > **Note:** PostgreSQL folds unquoted identifiers to lowercase. We intentionally keep the database name as **TUFDB** with quotes.

 ---

 ## ▶️ Run schema creation SQL (tables)
 **Where to execute:**
 - pgAdmin → expand **Databases** → `TUFDB` → right-click → **Query Tool**

 **How to execute:**
 - Paste the script below into the Query Tool and press **Execute** (⚡).

 ---

 ## 🧾 Schema creation script (TUFDB)
 ```sql
 -- Core customer
 CREATE TABLE IF NOT EXISTS customer (
	 customerid        VARCHAR(20) PRIMARY KEY,
	 firstname         VARCHAR(50) NOT NULL,
	 lastname          VARCHAR(50),
	 emailadd          VARCHAR(100) UNIQUE NOT NULL,
	 contactnum        VARCHAR(20),
	 addressline1      VARCHAR(100) NOT NULL,
	 addressline2      VARCHAR(100),
	 city              VARCHAR(30) NOT NULL,
	 pincode           VARCHAR(10) NOT NULL,
	 gender            VARCHAR(1),
	 dob               DATE NOT NULL,
	 isloyalty         BOOLEAN,
	 sysenrollmentdt   TIMESTAMP,
	 syslastmodifieddt TIMESTAMP
 );

 -- Subscriber preferences
 CREATE TABLE IF NOT EXISTS subscriber (
	 subscriberid   VARCHAR(20) PRIMARY KEY,
	 customerid     VARCHAR(20) REFERENCES customer(customerid),
	 issubscribe    BOOLEAN NOT NULL,
	 emailpermstatus BOOLEAN NOT NULL,
	 smspermstatus  BOOLEAN NOT NULL,
	 sysmodifieddt  TIMESTAMP
 );

 -- Interactions
 CREATE TABLE IF NOT EXISTS interaction (
	 interactionid    VARCHAR(20) PRIMARY KEY,
	 customerid       VARCHAR(20) REFERENCES customer(customerid),
	 interactionmode  VARCHAR(20) NOT NULL,
	 interactionvalue VARCHAR(40) NOT NULL,
	 interactiontype  VARCHAR(40) NOT NULL,
	 syslastmodifieddt TIMESTAMP
 );

 -- Orders (header)
 CREATE TABLE IF NOT EXISTS orderheader (
	 orderid          VARCHAR(20) PRIMARY KEY,
	 customerid       VARCHAR(20) REFERENCES customer(customerid),
	 totalamount      NUMERIC(10,2) NOT NULL,
	 taxamount        NUMERIC(10,2),
	 channel          VARCHAR(10),
	 payment          VARCHAR(10) NOT NULL,
	 discount         NUMERIC(10,2),
	 isloyalty        BOOLEAN,
	 syslastmodifieddt TIMESTAMP
 );

 -- Orders (line items)
 CREATE TABLE IF NOT EXISTS orderlineitems (
	 orderitemid  VARCHAR(50) PRIMARY KEY,
	 orderid      VARCHAR(50) REFERENCES orderheader(orderid),
	 skuid        VARCHAR(20) NOT NULL,
	 skuitem      VARCHAR(200) NOT NULL,
	 skuquantity  VARCHAR(3) NOT NULL,
	 skuprice     NUMERIC(10,2) NOT NULL
 );

 -- Loyalty points summary
 CREATE TABLE IF NOT EXISTS loyalty (
	 loyaltyid      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	 customerid     VARCHAR(20) REFERENCES customer(customerid),
	 totalpoints    NUMERIC(4,0),
	 tier           VARCHAR(15) NOT NULL,
	 isactive       BOOLEAN NOT NULL,
	 lastearnedat   TIMESTAMP NOT NULL,
	 lastredeemedat TIMESTAMP NOT NULL,
	 createdat      TIMESTAMP NOT NULL,
	 updatedat      TIMESTAMP
 );

 -- Loyalty ledger (audit trail)
 CREATE TABLE IF NOT EXISTS loyaltyledger (
	 ledgerid     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	 customerid   VARCHAR(20) REFERENCES customer(customerid),
	 orderid      VARCHAR(20) NOT NULL,
	 ledgertype   VARCHAR(20),
	 points       NUMERIC(4,0),
	 balanceafter INT,
	 expirydate   TIMESTAMP,
	 createdat    TIMESTAMP
 );
 ```

 ---

 ## 🧭 Execution order
 1. `customer`
 2. `subscriber`
 3. `interaction`
 4. `orderheader`
 5. `orderlineitems`
 6. `loyalty`
 7. `loyaltyledger`

 ---

 ## ✅ Notes for developers
 - Table and column names are **lowercase** to avoid quoted identifiers in Postgres.
 - Timestamps are stored as `TIMESTAMP` without time zone. Standardize to UTC in the app layer.
 - `orderid` in `loyaltyledger` is stored for traceability but is not enforced as a foreign key (by design in the script above).
 - If you need migrations instead of manual SQL, integrate with Prisma or a migration tool (Flyway/Liquibase).

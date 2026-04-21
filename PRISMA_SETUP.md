# Prisma Setup Guide

## Overview
This project uses **Prisma ORM** to interact with a PostgreSQL database instead of running raw SQL queries in the backend.

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `@prisma/client` - Prisma client for database queries
- `prisma` - CLI for migrations and schema management
- `dotenv` - Environment variable management

### 2. Configure Database Connection
Update the `.env` file with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
NODE_ENV=development
```

### 3. Generate Schema from Existing Database (Optional)
If your PostgreSQL database already has tables created (from schema-creation.md), you can auto-generate the Prisma schema:
```bash
npx prisma db pull
```

This command will:
- Introspect your PostgreSQL database
- Auto-generate `prisma/schema.prisma` based on existing tables
- Map database columns to proper Prisma types
- Create models for: `customer`, `subscriber`, `interaction`, `orderheader`, `orderlineitems`, `loyalty`, `loyaltyledger`

**Note:** Use this only if your database tables already exist. Skip this step if you're creating tables from scratch.

### 4. Generate Prisma Client
```bash
npx prisma generate
```

### 5. Run Database Migrations
If starting fresh:
```bash
npx prisma migrate dev --name init
```

Or if you already have the database:
```bash
npx prisma db push
```

### 6. Verify Database Connection
```bash
npx prisma studio
```
This opens a web UI to view and manage your database.

## Project Structure

### Files Created:
- **prisma/schema.prisma** - Database schema definition (Customer model)
- **src/utils/db.js** - Prisma client initialization
- **src/models/customer.js** - Customer model with CRUD operations
- **src/routes/customerRoutes.js** - Customer API endpoints

## Available API Endpoints

```
GET    /api/v1/customers              - Get all customers
GET    /api/v1/customers/:customerId  - Get customer by ID
GET    /api/v1/customers/search/:term - Search customers
POST   /api/v1/customers              - Create new customer
PUT    /api/v1/customers/:customerId  - Update customer
DELETE /api/v1/customers/:customerId  - Delete customer
```

## Usage Example

### Create a Customer
```javascript
const customerModel = require('./src/models/customer');

const newCustomer = await customerModel.createCustomer({
  customerId: 'CUST001',
  firstName: 'John',
  lastName: 'Doe',
  emailAdd: 'john@example.com',
  contactNum: '9876543210',
  addressLine1: '123 Main St',
  city: 'New York',
  pincode: '10001',
  dob: '1990-01-15',
});
```

### Fetch a Customer
```javascript
const customer = await customerModel.getCustomerById('CUST001');
```

### Update a Customer
```javascript
const updated = await customerModel.updateCustomer('CUST001', {
  firstName: 'Jane',
  contactNum: '1234567890',
});
```

### Search Customers
```javascript
const results = await customerModel.searchCustomers('John');
```

## Prisma Commands Reference

| Command | Description |
|---------|-------------|
| `npx prisma migrate dev` | Create and run database migration |
| `npx prisma migrate deploy` | Run pending migrations (production) |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npx prisma format` | Format schema.prisma file |
| `npx prisma validate` | Validate schema syntax |
| `npx prisma generate` | Generate Prisma Client |

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
NODE_ENV=development
```

## Notes

- Prisma automatically handles type conversions between JavaScript and PostgreSQL
- All timestamps are automatically set on create/update
- The `emailAdd` field is unique, enforced at database level
- Optional fields (nullable) are marked with `?` in the schema
- The model uses Prisma's built-in query generation for type-safe database access

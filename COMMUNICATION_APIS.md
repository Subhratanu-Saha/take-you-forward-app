# 📡 Communication & Engagement APIs Documentation

> **Interactive Documentation for Interactions, Subscribers, and DLQ Management**
>
> *Last Updated: September 2, 2026*

---

## 🎯 Quick Navigation

- [Overview](#overview)
- [API Access](#-api-access)
- [Interactions API](#-interactions-api)
- [Subscribers API](#-subscribers-api)
- [Promotional Messages & DLQ](#-promotional-messages--dlq-api)
- [Error Responses](#-error-response-contracts)
- [Testing Guide](#-testing-guide)
- [CI/CD Integration](#-cicd-integration)

---

## Overview

This document provides comprehensive guidance for testing and integrating with the **Communication & Engagement APIs**. These endpoints enable:

- ✅ **Multi-mode interaction management** (SIGNUP, ACCOUNT_CREATION, SYSTEM, etc.)
- ✅ **Subscriber permission tracking** (Email and SMS opt-in/out statuses)
- ✅ **Promotional message creation** (Single messages or bulk campaigns)
- ✅ **Dead Letter Queue (DLQ) management** (Failed message tracking and retry logic)

All endpoints are documented with **OpenAPI 3.0 specification** and accessible via **Swagger UI** for interactive testing.

---

## 🌐 API Access

### Local Development Environment

| Resource | URL |
|----------|-----|
| **🔵 Swagger UI Dashboard** | [http://localhost:5000/api-docs](http://localhost:5000/api-docs) |
| **📄 OpenAPI JSON Spec** | [http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json) |
| **🏥 Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) |

### Production Environment

| Resource | URL |
|----------|-----|
| **🔵 Swagger UI Dashboard** | https://take-you-forward-app.onrender.com/api-docs |
| **📄 OpenAPI JSON Spec** | https://take-you-forward-app.onrender.com/api-docs.json |
| **🏥 Health Check** | https://take-you-forward-app.onrender.com/api/health |

---

## 💬 Interactions API

### Overview

The **Interactions API** manages customer interactions across different interaction modes and types.

**Base Path:** `/api/v1/interactions`

### Endpoints

#### 1️⃣ **GET** `/api/v1/interactions/:interactionId`

**Method:** `GET`

**Description:** Fetches a single interaction record by its interaction ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ***interactionId*** | string | ✅ Yes | Unique interaction identifier (e.g., `INT-1720000000000-ABC123`) |

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "success": true,
  "message": "Interaction record fetched successfully",
  "data": {
    "interactionid": "INT-1720000000000-ABC123",
    "customerid": "CUST-1710000000000-ABC1234567",
    "interactionmode": "SIGNUP",
    "interactionvalue": "ACCOUNT_CREATION",
    "interactiontype": "SYSTEM",
    "syslastmodifieddt": "2026-08-09T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` — Interaction found
- `404 Not Found` — Interaction not found or missing ID

---

#### 2️⃣ **POST** `/api/v1/interactions`

**Method:** `POST`

**Description:** Creates a new interaction record.

**Request Payload:**
```json
{
  "customerid": "CUST-1710000000000-ABC1234567",
  "interactionmode": "SIGNUP",
  "interactionvalue": "ACCOUNT_CREATION",
  "interactiontype": "SYSTEM"
}
```

**Validation Rules:**
- ***customerid*** — Required
- ***interactionmode*** — Required; must be one of the allowed values
- ***interactionvalue*** — Required; must be one of the allowed values
- ***interactiontype*** — Required; must be one of the allowed values

**Response Payload (201 Created):**
```json
{
  "success": true,
  "message": "Interaction record created successfully",
  "data": {
    "interactionid": "INT-1720000000000-ABC123",
    "customerid": "CUST-1710000000000-ABC1234567",
    "interactionmode": "SIGNUP",
    "interactionvalue": "ACCOUNT_CREATION",
    "interactiontype": "SYSTEM",
    "syslastmodifieddt": "2026-08-09T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201 Created` — Interaction created successfully
- `400 Bad Request` — Validation failed or invalid payload

---

#### 3️⃣ **PUT** `/api/v1/interactions/:interactionId`

**Method:** `PUT`

**Description:** Updates an existing interaction record.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ***interactionId*** | string | ✅ Yes | Unique interaction identifier |

**Request Payload:**
```json
{
  "interactionmode": "SIGNUP",
  "interactionvalue": "ACCOUNT_CREATION",
  "interactiontype": "SYSTEM"
}
```

**Validation Rules:**
- ***interactionId*** — Required in path
- ***interactionmode*** — Must be one of the allowed values (if provided)
- ***interactionvalue*** — Must be one of the allowed values (if provided)
- ***interactiontype*** — Must be one of the allowed values (if provided)

**Response Payload (200 OK):**
```json
{
  "success": true,
  "message": "Interaction record updated successfully",
  "data": {
    "interactionid": "INT-1720000000000-ABC123",
    "customerid": "CUST-1710000000000-ABC1234567",
    "interactionmode": "SIGNUP",
    "interactionvalue": "ACCOUNT_CREATION",
    "interactiontype": "SYSTEM",
    "syslastmodifieddt": "2026-08-09T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` — Interaction updated successfully
- `400 Bad Request` — Validation failed or invalid payload

---

#### 4️⃣ **DELETE** `/api/v1/interactions/:interactionId`

Deletes an existing interaction record. Returns `204 No Content` on success and `404 Not Found` when the record does not exist.

---

---

## 👥 Subscribers API

### Overview

The **Subscribers API** manages subscriber records and communication permission preferences.

**Base Path:** `/api/v1/subscriber`

### Endpoints

#### 1️⃣ **GET** `/api/v1/subscriber?customerid={customerId}`

**Method:** `GET`

**Description:** Fetches the subscriber record for a customer using the customer ID query parameter.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ***customerid*** | string | ✅ Yes | Customer ID to look up |

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "success": true,
  "message": "Subscriber record fetched successfully",
  "data": {
    "subscriberid": "SUB-1720000000000-ABC123",
    "customerid": "CUST-1710000000000-ABC1234567",
    "issubscribe": true,
    "emailpermstatus": true,
    "smspermstatus": true,
    "sysmodifieddt": "2026-08-03T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` — Subscriber found
- `400 Bad Request` — Missing customer ID
- `404 Not Found` — Subscriber not found for the customer

---

#### 2️⃣ **GET** `/api/v1/subscriber/:subscriberId`

**Method:** `GET`

**Description:** Fetches a subscriber by its unique subscriber ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ***subscriberId*** | string | ✅ Yes | Unique subscriber identifier |

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "success": true,
  "message": "Subscriber record fetched successfully",
  "data": {
    "subscriberid": "SUB-1720000000000-ABC123",
    "customerid": "CUST-1710000000000-ABC1234567",
    "issubscribe": true,
    "emailpermstatus": true,
    "smspermstatus": true,
    "sysmodifieddt": "2026-08-03T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` — Subscriber found
- `400 Bad Request` — Missing subscriber ID
- `404 Not Found` — Subscriber not found

---

#### 3️⃣ **POST** `/api/v1/subscriber`

**Method:** `POST`

**Description:** Creates a new subscriber record.

**Request Payload:**
```json
{
  "customerid": "CUST-1710000000000-ABC1234567",
  "issubscribe": true,
  "emailpermstatus": true,
  "smspermstatus": true
}
```

**Validation Rules:**
- ***customerid*** — Required (also accepts `customerId`)
- ***issubscribe*** — Required; must be a boolean
- ***emailpermstatus*** — Required; must be a boolean (also accepts `emailPermStatus`)
- ***smspermstatus*** — Required; must be a boolean (also accepts `smsPermStatus`)

**Response Payload (201 Created):**
```json
{
  "success": true,
  "message": "Subscriber record created successfully",
  "data": {
    "subscriberid": "SUB-1720000000000-ABC123",
    "customerid": "CUST-1710000000000-ABC1234567",
    "issubscribe": true,
    "emailpermstatus": true,
    "smspermstatus": true,
    "sysmodifieddt": "2026-08-03T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201 Created` — Subscriber created successfully
- `400 Bad Request` — Validation failed or invalid payload

---

#### 4️⃣ **PUT** `/api/v1/subscriber/:subscriberId`

**Method:** `PUT`

**Description:** Updates an existing subscriber record.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ***subscriberId*** | string | ✅ Yes | Unique subscriber identifier |

**Request Payload:**
```json
{
  "issubscribe": false,
  "emailpermstatus": true,
  "smspermstatus": false
}
```

**Validation Rules:**
- ***subscriberId*** — Required in path
- ***issubscribe*** — Must be a boolean (if provided; also accepts `isSubscribe`)
- ***emailpermstatus*** — Must be a boolean (if provided; also accepts `emailPermStatus`)
- ***smspermstatus*** — Must be a boolean (if provided; also accepts `smsPermStatus`)

**Response Payload (200 OK):**
```json
{
  "success": true,
  "message": "Subscriber record updated successfully",
  "data": {
    "subscriberid": "SUB-1720000000000-ABC123",
    "customerid": "CUST-1710000000000-ABC1234567",
    "issubscribe": false,
    "emailpermstatus": true,
    "smspermstatus": false,
    "sysmodifieddt": "2026-08-03T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` — Subscriber updated successfully
- `400 Bad Request` — Validation failed or invalid payload

---

#### 5️⃣ **DELETE** `/api/v1/subscriber/:subscriberId`

Deletes an existing subscriber record. Returns `204 No Content` on success and `404 Not Found` when the record does not exist.

---

## 📧 Promotional Messages & DLQ API

### Overview

The **Promotional Messages API** manages promotional message creation, campaign dispatch, and Dead Letter Queue (DLQ) operations for failed messages.

**Base Path:** `/api/v1/promotionalmessage`

### Key Concepts

- ***DLQ (Dead Letter Queue):*** Repository for messages that failed after maximum retry attempts
- ***Campaign:*** Bulk message dispatch to multiple customers
- ***Retry:*** Manual intervention to re-attempt delivery of failed messages

### Endpoints

#### 1️⃣ **GET** `/api/v1/promotionalmessage/dlq`

**Method:** `GET`

**Description:** Retrieve all failed promotional messages from Dead Letter Queue. Messages in the DLQ have exhausted retry attempts and require manual intervention.

**Request Payload:** None

**Response Payload (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "eventid": "DLQ-1750000000000-ABC123",
      "customerid": "CUST-1750000000000-ABC123",
      "errormessage": "Network timeout after 3 retries",
      "payload": {
        "email": "customer@example.com",
        "subject": "50% Discount Offer",
        "body": "Get exclusive deals today!"
      },
      "attemptcount": 3,
      "status": "PENDING",
      "createdat": "2026-09-01T10:30:00.000Z"
    },
    {
      "eventid": "DLQ-1750000000001-XYZ789",
      "customerid": "CUST-1750000000001-DEF456",
      "errormessage": "Invalid email address",
      "payload": {
        "email": "invalid@.com",
        "subject": "Flash Sale",
        "body": "Limited time only!"
      },
      "attemptcount": 2,
      "status": "PENDING",
      "createdat": "2026-09-01T11:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` — DLQ messages retrieved successfully
- `500 Internal Server Error` — Server error

---

#### 2️⃣ **POST** `/api/v1/promotionalmessage/retry`

**Method:** `POST`

**Description:** Manually retry failed promotional messages from the Dead Letter Queue. Successful retries are moved back to normal processing.

**Request Payload:** Optional JSON object. The current implementation retries the pending DLQ batch, up to 50 records.
```json
{}
```

**Response Payload (200 OK):**
```json
{
  "success": true,
  "message": "Retry process completed",
  "data": [
    { "eventId": "DLQ-1750000000000-ABC123", "status": "retried" }
  ]
}
```

**Status Codes:**
- `200 OK` — Retry operation completed
- `500 Internal Server Error` — Server error

---

#### 3️⃣ **POST** `/api/v1/promotionalmessage/campaign`

**Method:** `POST`

**Description:** Send a promotional campaign to multiple customers. Messages are queued for asynchronous delivery.

**Request Payload:**
```json
{
  "campaignId": "CAM-1750000000000-XYZ789",
  "subject": "50% Off - Limited Time Offer",
  "promoCode": "SAVE50",
  "discountPercentage": 50,
  "campaignHeadline": "50% Off - Limited Time Offer",
  "storeUrl": "https://example.com/shop",
  "endDate": "2026-09-30T23:59:59.000Z"
}
```

**Validation Rules:**
- ***campaignId*** — Required; unique campaign identifier
- ***promoCode*** — Required; promotional code
- ***discountPercentage*** — Required; number from 0 to 100
- ***campaignHeadline*** — Required; campaign headline
- ***storeUrl*** — Required; valid HTTPS URL
- ***subject***, dates, and branding URLs — Optional

**Response Payload (200 OK):**
```json
{
  "success": true,
  "message": "Promotional campaign processed successfully",
  "data": {
    "campaignId": "CAM-1750000000000-XYZ789",
    "matched": 3,
    "sent": 3,
    "skipped": 0,
    "failed": 0
  }
}
```

**Status Codes:**
- `200 OK` — Campaign processed successfully
- `400 Bad Request` — Validation error - invalid campaign data
- `500 Internal Server Error` — Server error

---

#### 4️⃣ **POST** `/api/v1/promotionalmessage`

**Method:** `POST`

**Description:** Create and queue a single promotional message for a customer.

**Request Payload:**
```json
{
  "customerid": "CUST-1750000000000-ABC123",
  "title": "Exclusive Offer Just for You",
  "message": "We have a special deal waiting for you!",
  "promoCode": "WELCOME10",
  "discountPercentage": 10,
  "storeUrl": "https://example.com/shop"
}
```

**Validation Rules:**
- ***customerid*** — Required; target customer ID
- ***title*** — Required; message title, maximum 120 characters
- ***message*** — Required; message content, maximum 5000 characters
- ***customerid*** — Required; must match `CUST-{timestamp}-{10 alphanumeric characters}`
- ***campaignHeadline***, ***promoCode***, ***discountPercentage***, ***storeUrl***, and ***expirationDate*** — Optional

**Response Payload (201 Created):**
```json
{
  "success": true,
  "data": {
    "promotionalmessageid": "PM-1750000000000-NEW003",
    "customerid": "CUST-1750000000000-ABC123",
    "status": "PENDING"
  }
}
```

**Status Codes:**
- `201 Created` — Promotional message created successfully
- `400 Bad Request` — Validation error - invalid channel or missing required fields
- `500 Internal Server Error` — Server error

---

## ⚠️ Error Response Contracts

All APIs return standardized error responses for consistency. Below are the common error formats:

### 1️⃣ **Validation Error (400 Bad Request)**

***Scenario:*** Invalid input parameters or validation failure

```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    "Interaction mode must be one of: SIGNUP"
  ]
}
```

**Common Causes:**
- ❌ Invalid `interactionmode` (must be SIGNUP)
- ❌ Invalid `interactiontype` (must be SYSTEM)
- ❌ Invalid `interactionvalue` (must be ACCOUNT_CREATION)
- ❌ Missing required fields

---

### 2️⃣ **Not Found Error (404 Not Found)**

***Scenario:*** Resource does not exist or route not found

```json
{
  "success": false,
  "message": "Resource not found",
  "errorCode": "ROUTE_NOT_FOUND",
  "path": "/api/v1/interactions/INVALID-ID"
}
```

**Common Causes:**
- ❌ Interaction/Subscriber/Message ID doesn't exist
- ❌ Invalid route path
- ❌ Customer ID not found in database

---

### 3️⃣ **Server Error (500 Internal Server Error)**

***Scenario:*** Unexpected server-side error

```json
{
  "success": false,
  "message": "Internal server error",
  "errorCode": "INTERNAL_SERVER_ERROR"
}
```

**In Development Mode:** Stack trace is included
**In Production Mode:** Stack trace is omitted for security

---

## 🧪 Testing Guide

### Access Swagger UI

1. **Start Development Server:**
   ```bash
   npm start
   ```

2. **Open Swagger Dashboard:**
   - Navigate to: `http://localhost:5000/api-docs`

3. **Explore Endpoints:**
   - Expand each endpoint section
   - Read validation rules and examples
   - Review response schemas

### Interactive Testing Steps

#### Step 1: Test Interaction Creation

```
1. Expand "Interactions" section
2. Locate "POST /api/v1/interactions"
3. Click "Try it out"
4. Enter request body:
   {
     "customerid": "CUST-1710000000000-ABC1234567",
     "interactionmode": "SIGNUP",
     "interactionvalue": "ACCOUNT_CREATION",
     "interactiontype": "SYSTEM"
   }
5. Click "Execute"
6. Inspect response (should be 201 Created)
```

#### Step 2: Test Validation Error

```
1. Click "Try it out" again
2. Change "interactionmode" to "INVALID_MODE"
3. Click "Execute"
4. Inspect response (should be 400 Bad Request)
5. Review error details and validation message
```

#### Step 3: Test Subscriber Permissions

```
1. Expand "Subscribers" section
2. Test POST /api/v1/subscriber with customerid and boolean permission flags
3. Execute the request and inspect the 201 Created response
4. Test PUT /api/v1/subscriber/{subscriberId} with a permission update
```

#### Step 4: Test Promotional Messages & DLQ

```
1. Expand "Promotional Messages" section
2. Test POST /api/v1/promotionalmessage with:
   {
     "customerid": "CUST-1750000000000-ABC123",
    "title": "Exclusive Offer",
    "message": "Special discount just for you!"
   }
3. Review 201 Created response
4. Execute "GET /api/v1/promotionalmessage/dlq" to retrieve failed messages
5. Test "POST /api/v1/promotionalmessage/retry" to retry failed messages
```

### Test Scenarios

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| ***Valid Interaction*** | Valid mode, type, value | 201 Created | ✅ |
| ***Invalid Mode*** | Invalid interactionmode | 400 Validation Error | ✅ |
| ***Missing Customer ID*** | No customerid provided | 400 Validation Error | ✅ |
| ***Valid Subscriber*** | Valid customerid and permission flags | 201 Created | ✅ |
| ***Invalid Permission Flag*** | Non-boolean emailpermstatus | 400 Validation Error | ✅ |
| ***Get Interaction by ID*** | Valid interactionId | 200 OK | ✅ |
| ***Get Subscriber by Customer ID*** | Valid customerid query param | 200 OK | ✅ |
| ***Update Subscriber*** | Valid permission flag updates | 200 OK | ✅ |
| ***Create Promotional Message*** | Valid channel and customer ID | 201 Created | ✅ |
| ***Campaign Dispatch*** | Valid campaign metadata | 200 OK | ✅ |
| ***DLQ Retrieval*** | Get failed messages | 200 OK with array | ✅ |
| ***Retry Failed Messages*** | Pending DLQ batch | 200 OK with retry results | ✅ |

---

## 🔗 CI/CD Integration

### Export OpenAPI Specification

**Command:**
```bash
curl -X GET http://localhost:5000/api-docs.json | jq '.' > api-spec.json
```

**Or using wget:**
```bash
wget http://localhost:5000/api-docs.json -O api-spec.json
```

### Import into Postman

1. Open Postman
2. Click "Import" → "Link" tab
3. Paste URL: `http://localhost:5000/api-docs.json`
4. Click "Continue" → "Import"
5. Collections will be auto-generated

### Contract Testing

Use the OpenAPI spec for automated contract validation:

```bash
# Example: DroneCI/CI system
curl http://localhost:5000/api-docs.json > spec.json
npm run test:contract -- spec.json
```

### API Monitoring

Integrate `/api-docs.json` with monitoring tools:
- ***Postman Monitors:*** Scheduled API testing
- ***New Relic/DataDog:*** API health tracking
- ***Swagger Inspector:*** Real-time API validation

---

## 📞 Support & References

| Resource | Link |
|----------|------|
| ***Health Check Endpoint*** | `GET /api/health` |
| ***OpenAPI Specification*** | `/api-docs.json` |
| ***Swagger UI Dashboard*** | `/api-docs` |
| ***Request Context (Request ID)*** | Included in all responses via logs |
| ***Base URL (Local)*** | `http://localhost:5000` |
| ***Base URL (Production)*** | `https://take-you-forward-app.onrender.com` |

---

## 🎓 Key Takeaways

✨ ***All endpoints are fully documented with examples***

✨ ***Swagger UI provides interactive testing without external tools***

✨ ***Standardized error responses for easy debugging***

✨ ***OpenAPI spec available for CI/CD integration***

✨ ***Request ID tracking for audit logging and correlation***

---

**Documentation Version:** 1.0.0  
**Last Updated:** 2026-09-02  
**Author:** Development Team  
***Status:*** ✅ Active

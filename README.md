## Take You Forward

# Node.Js Powered Backend Application 

It's created using express.js and postgres. It runs on node.js 

route > middleware > controller > service > DB 

Route: 
- Create Endpoint
- Adding HTTP Methods
- Attaching Controllers to it

Controller:
- A function to process core request and response.

Middleware:
- Gatekeeper

Services:
- All the business logic goes here

Models:
- Transaction to DB

Utils: 
- Utility Functions

## Backend deployed URL: https://take-you-forward-app.onrender.com

## Neon DB: https://console.neon.tech/app/projects/muddy-surf-72146777?branchId=br-blue-surf-aod1k0wi

### Access the Interactive API Dashboard

The API documentation is powered by **Swagger UI** and provides an interactive testing board for all available endpoints.

#### Local Development:
- **Swagger UI Dashboard:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **Raw OpenAPI Spec:** [http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json)

#### Production:
- **Swagger UI Dashboard:** https://take-you-forward-app.onrender.com/api-docs
- **Raw OpenAPI Spec:** https://take-you-forward-app.onrender.com/api-docs.json

---

### 📋 API Endpoints Overview

#### **1. Communication & Engagement APIs**

##### **Interactions** (`/api/v1/interactions`)
Manage customer interaction channels and preferences.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/interactions/{interactionId}` | Retrieve a specific interaction record |
| `POST` | `/api/v1/interactions` | Create a new interaction |
| `PUT` | `/api/v1/interactions/{interactionId}` | Update an existing interaction |
| `DELETE` | `/api/v1/interactions/{interactionId}` | Delete an interaction |

**Validation Rules:**
- `interactionmode`: Must be `SIGNUP`
- `interactiontype`: Must be `SYSTEM`
- `interactionvalue`: Must be `ACCOUNT_CREATION`
- `customerid`: Must reference an existing customer

**Example Request (Create Interaction):**
```json
POST /api/v1/interactions
{
  "customerid": "CUST-1750000000000-ABC123",
  "interactionmode": "SIGNUP",
  "interactiontype": "SYSTEM",
  "interactionvalue": "ACCOUNT_CREATION"
}
```

---

##### **Subscribers** (`/api/v1/subscriber`)
Manage subscriber records and opt-in/opt-out preferences.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/subscriber?customerid={customerid}` | Retrieve subscriber by customer ID |
| `GET` | `/api/v1/subscriber/{subscriberId}` | Retrieve a specific subscriber record |
| `POST` | `/api/v1/subscriber` | Create a new subscriber record |
| `PUT` | `/api/v1/subscriber/{subscriberId}` | Update subscriber permissions (newsletter, SMS) |
| `DELETE` | `/api/v1/subscriber/{subscriberId}` | Delete a subscriber record |

**Permission Flags:**
- `issubscribe`: Boolean - Subscription status
- `emailpermstatus`: Boolean - Email permission status
- `smspermstatus`: Boolean - SMS permission status

**Example Request (Create Subscriber):**
```json
POST /api/v1/subscriber
{
  "customerid": "CUST-1750000000000-ABC123",
  "issubscribe": true,
  "emailpermstatus": true,
  "smspermstatus": false
}
```

---

#### **2. Promotional Campaign & DLQ Management**

##### **Promotional Messages** (`/api/v1/promotionalmessage`)
Send promotional campaigns and manage message delivery.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/promotionalmessage/dlq` | Retrieve failed messages from Dead Letter Queue |
| `POST` | `/api/v1/promotionalmessage/retry` | Retry failed promotional messages |
| `POST` | `/api/v1/promotionalmessage/campaign` | Send promotional campaign to multiple customers |
| `POST` | `/api/v1/promotionalmessage` | Create a single promotional message |

**Campaign Dispatch Example:**
```json
POST /api/v1/promotionalmessage/campaign
{
  "campaignid": "CAM-1750000000000-XYZ789",
  "campaignId": "CAM-1750000000000-XYZ789",
  "promoCode": "SAVE50",
  "discountPercentage": 50,
  "campaignHeadline": "50% Off - Limited Time Offer",
  "storeUrl": "https://example.com/shop",
  "endDate": "2026-09-30T23:59:59.000Z"
}
```

**DLQ Retry Example:**
```json
POST /api/v1/promotionalmessage/retry
{
  {}
}
```

---

### 🧪 Testing from Swagger UI

The interactive Swagger dashboard allows you to test all endpoints in real-time:

1. **Open Swagger UI:** Navigate to [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
2. **Expand Endpoint:** Click on any endpoint section (e.g., "Interactions", "Subscribers", "Promotional Messages")
3. **Try It Out:** Click the "Try it out" button
4. **Fill Request Data:** Enter parameters and request body
5. **Execute:** Click "Execute" to send the request
6. **View Response:** Inspect status code, headers, and response body
7. **Check Validation:** Swagger UI will highlight validation errors for invalid input

#### Example Test Cases:

**Test Case 1: Valid Interaction Creation**
- Send valid `interactionmode` (`SIGNUP`)
- Expect: `201 Created` with interaction record

**Test Case 2: Invalid Interaction Mode**
- Send `interactionmode: "INVALID_MODE"`
- Expect: `400 Validation Error` with error details

**Test Case 3: DLQ Retrieval**
- Execute `GET /api/v1/promotionalmessage/dlq`
- Expect: `200 OK` with array of failed messages

**Test Case 4: Campaign Retry**
- Execute `POST /api/v1/promotionalmessage/retry` with DLQ IDs
- Expect: `200 OK` with retry statistics

---

### 📊 Error Response Contracts

The API uses standardized error responses for consistency:

#### **Validation Error** (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": ["Interaction mode must be one of: SIGNUP"]
}
```

#### **Not Found Error** (404 Not Found)
```json
{
  "success": false,
  "message": "Resource not found",
  "errorCode": "ROUTE_NOT_FOUND",
  "path": "/api/v1/invalid-route"
}
```

#### **Server Error** (500 Internal Server Error)
```json
{
  "success": false,
  "message": "Internal server error",
  "errorCode": "INTERNAL_SERVER_ERROR"
}
```

---

### 🔗 CI/CD Integration

The raw OpenAPI specification can be used for:

- **Postman Imports:** Import the JSON spec directly into Postman collections
- **Contract Testing:** Use `/api-docs.json` for API contract validation
- **API Monitoring:** Integrate with APM tools for endpoint health checks
- **Documentation Sync:** Auto-generate docs from the specification

**Fetch OpenAPI Spec:**
```bash
curl -X GET http://localhost:5000/api-docs.json | jq '.'
```

---

### 🚀 Quick Start Guide

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Access Swagger UI:**
   ```
   http://localhost:5000/api-docs
   ```

3. **Test an endpoint:**
   - Navigate to the endpoint section
   - Click "Try it out"
   - Enter sample data
   - Click "Execute"

4. **Export OpenAPI Spec:**
   ```bash
   curl http://localhost:5000/api-docs.json > api-spec.json
   ```

---
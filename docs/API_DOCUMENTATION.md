# API Documentation - Centralized Delivery Network

## Base URL

**Development:** `http://localhost:5000/api`  
**Production:** `https://your-backend-url.onrender.com/api`

---

## Authentication

### JWT Authentication (Web App)

Most endpoints require JWT authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### API Key Authentication (Partner API)

External partner API endpoints use API key authentication via the `X-API-Key` header:

```
X-API-Key: pk_<your_api_key>
```

---

## Authentication Endpoints

### POST `/api/auth/register`

Register a new user (Agent, Partner, or Admin).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securePassword123",
  "role": "AGENT" | "PARTNER" | "ADMIN"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "user_id",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "AGENT",
    "agentId": "agent_id" // or partnerId for partners
  },
  "token": "jwt_token_here"
}
```

---

### POST `/api/auth/login`

Login and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_id",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "AGENT",
    "agentId": "agent_id"
  },
  "token": "jwt_token_here"
}
```

---

### GET `/api/auth/me`

Get current authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "user_id",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "AGENT",
  "agentId": "agent_id",
  "profilePicture": "/uploads/profiles/image.jpg"
}
```

---

### POST `/api/auth/profile-picture`

Upload profile picture.

**Headers:** `Authorization: Bearer <token>`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Image file (JPEG, PNG, WebP, GIF, max 5MB)

**Response:** `200 OK`
```json
{
  "url": "/uploads/profiles/profile-1234567890-abc123.jpg",
  "message": "Profile picture uploaded successfully"
}
```

---

## Partner API Endpoints (API Key Auth)

These endpoints are for external partner integrations using API key authentication.

### POST `/api/partner-api/orders`

Create a new delivery order.

**Headers:** `X-API-Key: pk_<your_api_key>`

**Request Body:**
```json
{
  "pickupLat": 28.7041,
  "pickupLng": 77.1025,
  "dropLat": 28.6139,
  "dropLng": 77.2090,
  "payoutAmount": 150.00,
  "priority": "HIGH" | "NORMAL" | "LOW",
  "estimatedDuration": 30
}
```

**Response:** `201 Created`
```json
{
  "id": "order_id",
  "trackingNumber": "TRK123456",
  "status": "SEARCHING_AGENT",
  "pickup": {
    "latitude": 28.7041,
    "longitude": 77.1025
  },
  "dropoff": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "payout": 150.00,
  "priority": "HIGH",
  "estimatedDuration": 30,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET `/api/partner-api/orders/:id`

Get order details by ID.

**Headers:** `X-API-Key: pk_<your_api_key>`

**Response:** `200 OK`
```json
{
  "id": "order_id",
  "trackingNumber": "TRK123456",
  "status": "ASSIGNED",
  "pickup": {
    "latitude": 28.7041,
    "longitude": 77.1025
  },
  "dropoff": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "payout": 150.00,
  "priority": "HIGH",
  "agent": {
    "id": "agent_id",
    "name": "Agent Name",
    "phone": "+1234567890",
    "rating": 4.5
  },
  "assignedAt": "2024-01-15T10:35:00Z",
  "pickedUpAt": null,
  "deliveredAt": null
}
```

---

## Partner Web App Endpoints (JWT Auth)

These endpoints require JWT authentication and are used by the partner web dashboard.

### GET `/api/partner/profile`

Get partner profile information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "partner_id",
  "companyName": "Food Delivery Co",
  "apiKey": "pk_1234567890_abc123",
  "webhookUrl": "https://partner.com/webhook",
  "isActive": true,
  "user": {
    "id": "user_id",
    "name": "Partner Name",
    "email": "partner@example.com",
    "phone": "+1234567890"
  }
}
```

---

### PUT `/api/partner/webhook`

Update webhook URL.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "webhookUrl": "https://partner.com/webhook"
}
```

**Response:** `200 OK`
```json
{
  "id": "partner_id",
  "webhookUrl": "https://partner.com/webhook"
}
```

---

### POST `/api/partner/regenerate-api-key`

Regenerate API key (invalidates old key).

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "partner_id",
  "apiKey": "pk_new_key_here",
  "message": "API key regenerated successfully. Please update your integrations with the new key."
}
```

---

### POST `/api/partner/orders`

Create order (same as partner-api endpoint, but uses JWT auth).

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as `/api/partner-api/orders`

---

### GET `/api/partner/orders`

List partner's orders with filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (SEARCHING_AGENT, ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "orders": [
    {
      "id": "order_id",
      "trackingNumber": "TRK123456",
      "status": "ASSIGNED",
      "payout": 150.00,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

---

### GET `/api/partner/orders/:id`

Get order details.

**Headers:** `Authorization: Bearer <token>`

**Response:** Same as `/api/partner-api/orders/:id`

---

### GET `/api/partner/dashboard`

Get partner dashboard metrics.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "todayOrders": 25,
  "monthlyOrders": 750,
  "monthlyTrend": 12.5,
  "activeOrders": 5,
  "deliveryIssues": 2,
  "totalDeliveries": 5000
}
```

---

### GET `/api/partner/analytics`

Get partner analytics data.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response:** `200 OK`
```json
{
  "ordersByStatus": {
    "DELIVERED": 4500,
    "CANCELLED": 200,
    "IN_PROGRESS": 300
  },
  "ordersByDay": [
    { "date": "2024-01-15", "count": 25 },
    { "date": "2024-01-16", "count": 30 }
  ],
  "averageDeliveryTime": 28.5,
  "totalPayout": 750000.00
}
```

---

## Agent Endpoints

### GET `/api/agent/profile`

Get agent profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "agent_id",
  "status": "ONLINE",
  "vehicleType": "BIKE",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "isApproved": true,
  "rating": 4.5,
  "totalOrders": 500,
  "completedOrders": 480,
  "acceptanceRate": 95.5,
  "user": {
    "id": "user_id",
    "name": "Agent Name",
    "email": "agent@example.com",
    "phone": "+1234567890"
  },
  "documents": [
    {
      "id": "doc_id",
      "documentType": "LICENSE",
      "fileName": "license.pdf",
      "fileUrl": "/uploads/documents/license.pdf",
      "verified": true,
      "uploadedAt": "2024-01-10T10:00:00Z"
    }
  ]
}
```

---

### PUT `/api/agent/profile`

Update agent profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "vehicleType": "BIKE" | "SCOOTER" | "CAR" | "BICYCLE"
}
```

---

### POST `/api/agent/location`

Update agent location.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "latitude": 28.7041,
  "longitude": 77.1025
}
```

**Response:** `200 OK`
```json
{
  "message": "Location updated successfully"
}
```

---

### POST `/api/agent/status`

Update agent status (online/offline).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "ONLINE" | "OFFLINE"
}
```

**Response:** `200 OK`
```json
{
  "id": "agent_id",
  "status": "ONLINE"
}
```

---

### GET `/api/agent/orders`

Get available orders for agent.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `sortBy` (optional): `distance` | `payout` | `time` (default: `distance`)
- `maxDistance` (optional): Maximum distance in meters (default: 5000)

**Response:** `200 OK`
```json
[
  {
    "id": "order_id",
    "trackingNumber": "TRK123456",
    "pickup": {
      "latitude": 28.7041,
      "longitude": 77.1025
    },
    "dropoff": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "payout": 150.00,
    "priority": "HIGH",
    "distance": 1250.5,
    "estimatedDuration": 30
  }
]
```

---

### POST `/api/agent/orders/:id/accept`

Accept an order.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "order_id",
  "status": "ASSIGNED",
  "message": "Order accepted successfully"
}
```

---

### POST `/api/agent/orders/:id/reject`

Reject an order offer.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Order rejected"
}
```

---

### PUT `/api/agent/orders/:id/status`

Update order status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED",
  "cancellationReason": "Optional reason for cancellation"
}
```

**Response:** `200 OK`
```json
{
  "id": "order_id",
  "status": "DELIVERED",
  "message": "Order status updated successfully"
}
```

---

### GET `/api/agent/my-orders`

Get agent's assigned/active orders.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status

**Response:** `200 OK`
```json
[
  {
    "id": "order_id",
    "trackingNumber": "TRK123456",
    "status": "OUT_FOR_DELIVERY",
    "pickup": {
      "latitude": 28.7041,
      "longitude": 77.1025
    },
    "dropoff": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "payout": 150.00,
    "pickedUpAt": "2024-01-15T11:00:00Z"
  }
]
```

---

### GET `/api/agent/metrics`

Get agent performance metrics.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "todayOrders": 5,
  "monthlyEarnings": 15000.00,
  "completedOrders": 480,
  "acceptanceRate": 95.5,
  "rating": 4.5
}
```

---

### POST `/api/agent/documents`

Upload document (License, Vehicle Registration, ID Proof).

**Headers:** `Authorization: Bearer <token>`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Document file (JPEG, PNG, WebP, PDF, max 5MB)
- `documentType`: `LICENSE` | `VEHICLE_REG` | `ID_PROOF`

**Response:** `200 OK`
```json
{
  "id": "doc_id",
  "documentType": "LICENSE",
  "fileName": "license.pdf",
  "fileUrl": "/uploads/documents/license.pdf",
  "verified": false,
  "uploadedAt": "2024-01-15T10:00:00Z"
}
```

---

## Admin Endpoints

### GET `/api/admin/metrics/overview`

Get system overview metrics.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response:** `200 OK`
```json
{
  "totalOrders": 10000,
  "completedOrders": 8500,
  "activeAgents": 150,
  "totalPartners": 25,
  "totalRevenue": 1500000.00,
  "averageDeliveryTime": 28.5
}
```

---

### GET `/api/admin/agents`

List all agents.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Query Parameters:**
- `status` (optional): Filter by status
- `isApproved` (optional): Filter by approval status
- `search` (optional): Search by name/email
- `limit` (optional): Results limit (default: 20)
- `offset` (optional): Pagination offset

**Response:** `200 OK`
```json
{
  "agents": [
    {
      "id": "agent_id",
      "status": "ONLINE",
      "isApproved": true,
      "rating": 4.5,
      "totalOrders": 500,
      "user": {
        "name": "Agent Name",
        "email": "agent@example.com"
      }
    }
  ],
  "total": 200,
  "limit": 20,
  "offset": 0
}
```

---

### POST `/api/admin/agents/:id/approve`

Approve an agent.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Response:** `200 OK`
```json
{
  "message": "Agent approved successfully",
  "agent": {
    "id": "agent_id",
    "isApproved": true,
    "user": {
      "name": "Agent Name",
      "email": "agent@example.com"
    }
  }
}
```

---

### POST `/api/admin/agents/:id/block`

Block an agent.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Request Body:**
```json
{
  "reason": "Violation of terms"
}
```

**Response:** `200 OK`
```json
{
  "message": "Agent blocked successfully",
  "agent": {
    "id": "agent_id",
    "isBlocked": true,
    "blockedReason": "Violation of terms"
  }
}
```

---

### POST `/api/admin/orders/:id/reassign`

Force reassign an order.

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Request Body:**
```json
{
  "agentId": "new_agent_id" // Optional - omit to set order back to searching
}
```

**Response:** `200 OK`
```json
{
  "message": "Order reassigned successfully",
  "order": {
    "id": "order_id",
    "status": "ASSIGNED",
    "agentId": "new_agent_id"
  }
}
```

---

## Webhook Events

When an order status changes, a webhook is sent to the partner's configured webhook URL.

### Webhook Payload

**URL:** Partner's configured webhook URL  
**Method:** POST  
**Content-Type:** application/json

**Payload:**
```json
{
  "event": "ORDER_ASSIGNED" | "ORDER_PICKED_UP" | "ORDER_DELIVERED" | "ORDER_CANCELLED",
  "orderId": "order_id",
  "trackingNumber": "TRK123456",
  "status": "ASSIGNED",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "agentId": "agent_id",
    "assignedAt": "2024-01-15T10:35:00Z",
    "pickedUpAt": null,
    "deliveredAt": null,
    "cancellationReason": null
  }
}
```

### Event Types

- `ORDER_CREATED` - Order created (sent immediately)
- `ORDER_ASSIGNED` - Agent accepted the order
- `ORDER_PICKED_UP` - Agent picked up the order
- `ORDER_DELIVERED` - Order delivered successfully
- `ORDER_CANCELLED` - Order cancelled

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden - insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Order has already been assigned"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Partner API:** 100 requests per minute per API key
- **Web App API:** 200 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234560
```

---

## Support

For API support, contact: support@deliveryhub.com


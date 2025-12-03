# Partner Integration Guide

This guide will help you integrate your system with the Centralized Delivery Network API to create and track delivery orders.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Creating Orders](#creating-orders)
4. [Tracking Orders](#tracking-orders)
5. [Webhook Integration](#webhook-integration)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)

---

## Getting Started

### 1. Obtain Your API Key

1. Log in to your Partner Dashboard at `https://your-app-url.com/partner/settings`
2. Navigate to **Settings** → **API Configuration**
3. Copy your API key (format: `pk_<timestamp>_<random>`)
4. **Important:** Keep your API key secure and never expose it in client-side code

### 2. Base URL

**Development:** `http://localhost:5000/api/partner-api`  
**Production:** `https://your-backend-url.onrender.com/api/partner-api`

---

## Authentication

All API requests must include your API key in the `X-API-Key` header:

```http
X-API-Key: pk_1234567890_abc123
```

**Example:**
```bash
curl -X POST https://api.example.com/api/partner-api/orders \
  -H "X-API-Key: pk_1234567890_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLat": 28.7041,
    "pickupLng": 77.1025,
    "dropLat": 28.6139,
    "dropLng": 77.2090,
    "payoutAmount": 150.00
  }'
```

---

## Creating Orders

### Endpoint

`POST /api/partner-api/orders`

### Request Body

```json
{
  "pickupLat": 28.7041,        // Required: Pickup latitude
  "pickupLng": 77.1025,        // Required: Pickup longitude
  "dropLat": 28.6139,          // Required: Drop-off latitude
  "dropLng": 77.2090,          // Required: Drop-off longitude
  "payoutAmount": 150.00,      // Required: Payout amount in your currency
  "priority": "NORMAL",         // Optional: HIGH | NORMAL | LOW (default: NORMAL)
  "estimatedDuration": 30      // Optional: Estimated duration in minutes
}
```

### Response

**Success (201 Created):**
```json
{
  "id": "order_abc123",
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
  "priority": "NORMAL",
  "estimatedDuration": 30,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Invalid request data",
  "details": {
    "pickupLat": "Pickup latitude is required"
  }
}
```

---

## Tracking Orders

### Get Order Status

**Endpoint:** `GET /api/partner-api/orders/:id`

**Example:**
```bash
curl -X GET https://api.example.com/api/partner-api/orders/order_abc123 \
  -H "X-API-Key: pk_1234567890_abc123"
```

**Response:**
```json
{
  "id": "order_abc123",
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
  "priority": "NORMAL",
  "agent": {
    "id": "agent_xyz789",
    "name": "John Doe",
    "phone": "+1234567890",
    "rating": 4.5
  },
  "assignedAt": "2024-01-15T10:35:00Z",
  "pickedUpAt": null,
  "deliveredAt": null,
  "estimatedDuration": 30
}
```

### Order Statuses

- `SEARCHING_AGENT` - Order created, searching for available agent
- `ASSIGNED` - Agent has accepted the order
- `PICKED_UP` - Agent has picked up the order
- `OUT_FOR_DELIVERY` - Order is out for delivery
- `DELIVERED` - Order delivered successfully
- `CANCELLED` - Order cancelled

---

## Webhook Integration

To receive real-time order status updates, configure a webhook URL in your partner dashboard.

### Setting Up Webhooks

1. Go to **Settings** → **Webhook Configuration**
2. Enter your webhook URL (must be HTTPS in production)
3. Save the configuration

### Webhook Payload

When an order status changes, a POST request will be sent to your webhook URL:

**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: <signature> (optional, for verification)
```

**Payload:**
```json
{
  "event": "ORDER_ASSIGNED",
  "orderId": "order_abc123",
  "trackingNumber": "TRK123456",
  "status": "ASSIGNED",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "agentId": "agent_xyz789",
    "agentName": "John Doe",
    "agentPhone": "+1234567890",
    "assignedAt": "2024-01-15T10:35:00Z",
    "pickedUpAt": null,
    "deliveredAt": null,
    "cancellationReason": null
  }
}
```

### Event Types

- `ORDER_CREATED` - Order created (sent immediately after creation)
- `ORDER_ASSIGNED` - Agent accepted the order
- `ORDER_PICKED_UP` - Agent picked up the order
- `ORDER_OUT_FOR_DELIVERY` - Order is out for delivery
- `ORDER_DELIVERED` - Order delivered successfully
- `ORDER_CANCELLED` - Order cancelled

### Webhook Security (Recommended)

Verify webhook authenticity by checking the signature header:

```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing API key
- `403 Forbidden` - API key valid but account inactive
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": "Error message here",
  "details": {
    "field": "Specific field error"
  }
}
```

### Retry Logic

For transient errors (5xx), implement exponential backoff:

```python
import time
import random

def retry_with_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait_time)
```

---

## Best Practices

### 1. Store API Key Securely

- Never commit API keys to version control
- Use environment variables or secure key management
- Rotate API keys periodically

### 2. Handle Webhooks Properly

- Respond with 200 OK immediately
- Process webhook payloads asynchronously
- Implement idempotency checks (handle duplicate webhooks)

### 3. Error Handling

- Always check HTTP status codes
- Log errors for debugging
- Implement retry logic for transient failures
- Handle rate limiting gracefully

### 4. Order Creation

- Validate coordinates before sending
- Set appropriate priority levels
- Include estimated duration when possible
- Don't create duplicate orders

### 5. Polling vs Webhooks

- **Use Webhooks** for real-time updates (recommended)
- **Use Polling** only if webhooks are not feasible
- Poll interval: Minimum 30 seconds

---

## Code Examples

### Python

```python
import requests
import os
from typing import Optional, Dict

class DeliveryAPI:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_order(
        self,
        pickup_lat: float,
        pickup_lng: float,
        drop_lat: float,
        drop_lng: float,
        payout_amount: float,
        priority: str = 'NORMAL',
        estimated_duration: Optional[int] = None
    ) -> Dict:
        """Create a new delivery order"""
        url = f"{self.base_url}/api/partner-api/orders"
        data = {
            'pickupLat': pickup_lat,
            'pickupLng': pickup_lng,
            'dropLat': drop_lat,
            'dropLng': drop_lng,
            'payoutAmount': payout_amount,
            'priority': priority
        }
        if estimated_duration:
            data['estimatedDuration'] = estimated_duration
        
        response = requests.post(url, json=data, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_order(self, order_id: str) -> Dict:
        """Get order details"""
        url = f"{self.base_url}/api/partner-api/orders/{order_id}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

# Usage
api = DeliveryAPI(
    api_key=os.getenv('DELIVERY_API_KEY'),
    base_url='https://api.example.com'
)

# Create order
order = api.create_order(
    pickup_lat=28.7041,
    pickup_lng=77.1025,
    drop_lat=28.6139,
    drop_lng=77.2090,
    payout_amount=150.00,
    priority='HIGH'
)

print(f"Order created: {order['trackingNumber']}")

# Track order
order_status = api.get_order(order['id'])
print(f"Order status: {order_status['status']}")
```

### Node.js

```javascript
const axios = require('axios');

class DeliveryAPI {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  async createOrder({
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    payoutAmount,
    priority = 'NORMAL',
    estimatedDuration
  }) {
    const url = `${this.baseUrl}/api/partner-api/orders`;
    const data = {
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      payoutAmount,
      priority
    };
    
    if (estimatedDuration) {
      data.estimatedDuration = estimatedDuration;
    }

    const response = await axios.post(url, data, { headers: this.headers });
    return response.data;
  }

  async getOrder(orderId) {
    const url = `${this.baseUrl}/api/partner-api/orders/${orderId}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }
}

// Usage
const api = new DeliveryAPI(
  process.env.DELIVERY_API_KEY,
  'https://api.example.com'
);

// Create order
const order = await api.createOrder({
  pickupLat: 28.7041,
  pickupLng: 77.1025,
  dropLat: 28.6139,
  dropLng: 77.2090,
  payoutAmount: 150.00,
  priority: 'HIGH'
});

console.log(`Order created: ${order.trackingNumber}`);

// Track order
const orderStatus = await api.getOrder(order.id);
console.log(`Order status: ${orderStatus.status}`);
```

### PHP

```php
<?php

class DeliveryAPI {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl) {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
    }
    
    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        $headers = [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("API Error: " . $response);
        }
        
        return json_decode($response, true);
    }
    
    public function createOrder($pickupLat, $pickupLng, $dropLat, $dropLng, $payoutAmount, $priority = 'NORMAL', $estimatedDuration = null) {
        $data = [
            'pickupLat' => $pickupLat,
            'pickupLng' => $pickupLng,
            'dropLat' => $dropLat,
            'dropLng' => $dropLng,
            'payoutAmount' => $payoutAmount,
            'priority' => $priority
        ];
        
        if ($estimatedDuration !== null) {
            $data['estimatedDuration'] = $estimatedDuration;
        }
        
        return $this->makeRequest('POST', '/api/partner-api/orders', $data);
    }
    
    public function getOrder($orderId) {
        return $this->makeRequest('GET', '/api/partner-api/orders/' . $orderId);
    }
}

// Usage
$api = new DeliveryAPI(
    getenv('DELIVERY_API_KEY'),
    'https://api.example.com'
);

// Create order
$order = $api->createOrder(
    28.7041,  // pickupLat
    77.1025,  // pickupLng
    28.6139,  // dropLat
    77.2090,  // dropLng
    150.00,   // payoutAmount
    'HIGH'    // priority
);

echo "Order created: " . $order['trackingNumber'] . "\n";

// Track order
$orderStatus = $api->getOrder($order['id']);
echo "Order status: " . $orderStatus['status'] . "\n";
```

### Webhook Handler Example (Node.js/Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const { event, orderId, status, data } = req.body;
  
  // Respond immediately
  res.status(200).json({ received: true });
  
  // Process webhook asynchronously
  processWebhook({ event, orderId, status, data });
});

async function processWebhook({ event, orderId, status, data }) {
  switch (event) {
    case 'ORDER_ASSIGNED':
      console.log(`Order ${orderId} assigned to agent ${data.agentId}`);
      // Update your database, send notification, etc.
      break;
    case 'ORDER_PICKED_UP':
      console.log(`Order ${orderId} picked up`);
      break;
    case 'ORDER_DELIVERED':
      console.log(`Order ${orderId} delivered`);
      // Mark order as completed in your system
      break;
    case 'ORDER_CANCELLED':
      console.log(`Order ${orderId} cancelled: ${data.cancellationReason}`);
      break;
  }
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

---

## Support

For integration support:
- **Email:** support@deliveryhub.com
- **Documentation:** https://docs.deliveryhub.com
- **Status Page:** https://status.deliveryhub.com

---

## FAQ

### Q: How do I regenerate my API key?

A: Log in to your partner dashboard → Settings → API Configuration → Click "Regenerate API Key". **Note:** This will invalidate your old key immediately.

### Q: What happens if I exceed the rate limit?

A: You'll receive a `429 Too Many Requests` response. Wait for the reset time (indicated in headers) before retrying.

### Q: Can I cancel an order after creation?

A: Orders can only be cancelled by agents or admins. Contact support if you need to cancel an order.

### Q: How accurate are the coordinates?

A: Use GPS coordinates with at least 6 decimal places for accuracy. Example: `28.704123, 77.102456`

### Q: What currency is used for payout amounts?

A: Use your local currency. The system will handle conversion internally if needed.

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API release
- Order creation and tracking
- Webhook support


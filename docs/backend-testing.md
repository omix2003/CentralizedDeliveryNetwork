# Phase 5 Testing Guide - Order Assignment Engine

This guide will help you test the Order Assignment Engine functionality.

## Prerequisites

1. **Redis must be running**
   ```bash
   # Check if Redis is running
   redis-cli ping
   # Should return: PONG
   ```

2. **Database seeded with test data**
   ```bash
   cd backend
   npm run prisma:seed
   ```

3. **Backend server running** (optional, for API testing)
   ```bash
   npm run dev
   ```

## Quick Test (Automated)

Run the automated test script:

```bash
cd backend
npm run test:assignment
```

This will:
- ✅ Set up test agent locations in Redis
- ✅ Test finding nearby agents
- ✅ Test agent scoring algorithm
- ✅ Test order assignment flow
- ✅ Test auto-assignment for high priority orders

## Manual Testing Steps

### Step 1: Prepare Test Data

1. **Ensure agents are online and have locations in Redis:**

   You can use the test script or manually:
   ```bash
   # Login as an agent and update location via API
   POST /api/agent/location
   {
     "latitude": 40.7128,
     "longitude": -74.0060
   }
   ```

2. **Verify agents are in Redis:**
   ```bash
   redis-cli
   > ZRANGE agents_locations 0 -1 WITHSCORES
   ```

### Step 2: Create an Order (Partner API)

**Option A: Via Partner Dashboard (Frontend)**
1. Login as a partner
2. Go to "Create Order"
3. Enter pickup and dropoff locations
4. Set payout amount
5. Submit order

**Option B: Via API (Direct)**

```bash
# Get partner API key from database or partner profile
# Then create order:

curl -X POST http://localhost:5000/api/partner-api/orders \
  -H "X-API-Key: YOUR_PARTNER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLat": 40.7128,
    "pickupLng": -74.0060,
    "dropLat": 40.7589,
    "dropLng": -73.9851,
    "payoutAmount": 50.0,
    "priority": "NORMAL"
  }'
```

### Step 3: Verify Assignment Engine Triggered

Check backend logs for:
```
[Assignment] Selected X agents for order ...
[Assignment] Order ... offered to X agents via WebSocket + FCM
```

### Step 4: Accept Order (Agent)

**Option A: Via Agent Dashboard (Frontend)**
1. Login as an agent
2. View available orders
3. Click "Accept" on the order

**Option B: Via API**

```bash
# First, login as agent to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@agent.com",
    "password": "password123"
  }'

# Use the token to accept order
curl -X POST http://localhost:5000/api/agent/orders/ORDER_ID/accept \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5: Verify Assignment

Check:
1. **Order status changed to ASSIGNED:**
   ```bash
   GET /api/partner/orders/ORDER_ID
   ```

2. **Agent status changed to ON_TRIP:**
   ```bash
   GET /api/agent/profile
   ```

3. **Partner webhook received** (if webhook URL configured)

4. **Backend logs show assignment:**
   ```
   [Assignment] Order assigned to agent ...
   [WebSocket] Order offer sent to agent ...
   ```

## Testing Scenarios

### Scenario 1: Normal Assignment Flow
1. Create order with normal priority
2. Verify agents are found and scored
3. Verify order is offered to top 5 agents
4. Agent accepts order
5. Verify assignment and notifications

### Scenario 2: High Priority Auto-Assignment
1. Create order with HIGH priority
2. Use `autoAssignOrder` function
3. Verify order is immediately assigned to best agent
4. Verify no offer step (direct assignment)

### Scenario 3: No Agents Available
1. Set all agents to OFFLINE
2. Create order
3. Verify assignment returns "No available agents found"

### Scenario 4: Agent Scoring
1. Create multiple agents with different:
   - Distances from pickup
   - Acceptance rates
   - Ratings
   - Experience (total orders)
2. Create order
3. Verify agents are scored and ranked correctly

### Scenario 5: WebSocket Notifications
1. Connect agent client to WebSocket
2. Create order
3. Verify `order:offer` event received
4. Accept order via WebSocket or API
5. Verify `order:assigned` event received

## Debugging

### Check Redis GEO Data
```bash
redis-cli
> GEORADIUS agents_locations -74.0060 40.7128 5000 m WITHCOORD WITHDIST
```

### Check Agent Status
```sql
SELECT id, status, isApproved, currentOrderId, acceptanceRate, rating 
FROM "Agent" 
WHERE status = 'ONLINE' AND isApproved = true;
```

### Check Order Status
```sql
SELECT id, status, "agentId", "assignedAt", priority 
FROM "Order" 
WHERE status = 'SEARCHING_AGENT' OR status = 'ASSIGNED';
```

### View Backend Logs
Look for:
- `[Assignment]` - Assignment engine logs
- `[WebSocket]` - WebSocket connection/event logs
- `[FCM]` - Push notification logs

## Common Issues

### Issue: "No available agents found"
**Solution:**
- Ensure agents are ONLINE: `status = 'ONLINE'`
- Ensure agents are approved: `isApproved = true`
- Ensure agents have locations in Redis
- Check Redis connection: `redis-cli ping`

### Issue: "Redis not available"
**Solution:**
- Start Redis: `redis-server`
- Check REDIS_URL in .env
- Or set REDIS_ENABLED=false to disable Redis (assignment won't work)

### Issue: WebSocket not connecting
**Solution:**
- Check CORS_ORIGIN in .env matches frontend URL
- Verify JWT token is valid
- Check WebSocket path: `/socket.io`

### Issue: FCM notifications not working
**Solution:**
- Set FIREBASE_SERVICE_ACCOUNT in .env
- Ensure Firebase Admin SDK is initialized
- Check agent has FCM token in NotificationToken table

## Expected Results

After successful testing, you should see:

1. ✅ Agents found within 5km radius
2. ✅ Agents scored and ranked by multiple factors
3. ✅ Order offered to top 5 agents
4. ✅ WebSocket notifications sent
5. ✅ FCM push notifications sent (if configured)
6. ✅ Order assigned when agent accepts
7. ✅ Partner webhook triggered
8. ✅ Agent status updated to ON_TRIP
9. ✅ Order status updated to ASSIGNED

## Next Steps

After testing Phase 5, you can proceed to:
- **Phase 6**: Admin Module
- **Phase 7**: Real-time Features (enhance WebSocket)
- **Phase 8**: Analytics & Metrics









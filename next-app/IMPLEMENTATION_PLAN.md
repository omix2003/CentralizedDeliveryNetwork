# Implementation Plan - Centralized Delivery Network

## 🎯 Phase-by-Phase Development Approach

### **Phase 1: Foundation Setup** (Week 1)

#### 1.1 Project Setup

- [X] Install all required dependencies
- [X] Set up environment variables (.env.local)
- [X] Configure Prisma with PostgreSQL
- [X] Set up Redis connection
- [X] Initialize NextAuth configuration
- [X] Create base folder structure

#### 1.2 Database Setup

- [X] Run Prisma migrations
- [X] Create seed script for test data
- [X] Set up database indexes for performance

#### 1.3 Core Utilities

- [X] Create Prisma client singleton
- [X] Set up Redis client with GEO support
- [X] Create authentication utilities
- [X] Set up error handling utilities
- [X] Create validation schemas (Zod)

---

### **Phase 2: Authentication & Authorization** (Week 1-2)

#### 2.1 Auth System

- [X] Implement NextAuth configuration
- [X] Create login API route
- [X] Create register API route (role-based)
- [X] Implement JWT token generation
- [X] Create password hashing utilities

#### 2.2 Role-Based Access Control

- [X] Create auth middleware
- [X] Implement route protection by role
- [X] Create role checking utilities
- [X] Set up protected route layouts

#### 2.3 Auth UI

- [X] Create login page
- [X] Create registration pages (Agent, Partner, Admin)
- [X] Implement form validation
- [X] Add error handling UI

---

### **Phase 3: Agent Module** (Week 2-3)

#### 3.1 Agent Registration & Profile

- [X] Agent registration form with document upload
- [X] Profile management page
- [X] Document upload API
- [X] KYC verification flow

#### 3.2 Agent Dashboard

- [X] Online/Offline toggle component
- [X] Location tracking service (client-side)
- [X] Location update API endpoint
- [X] Store location in Redis GEO

#### 3.3 Order Management (Agent)

- [X] Available orders list API
- [X] Order card component
- [X] Accept/reject order API
- [X] Order status update flow
- [X] Real-time order notifications (WebSocket)
- [X] Location-based order filtering
- [X] Order sorting (distance, payout, time)
- [X] Agent metrics API (today's orders, monthly earnings)

---

### **Phase 4: Partner Module** (Week 3-4)

#### 4.1 Partner Registration & Setup

- [X] Partner registration
- [X] API key generation
- [X] Webhook configuration page

#### 4.2 Partner API Integration

- [X] POST /api/partner/orders - Create order
- [X] GET /api/partner/orders/[id] - Get order details
- [X] API key authentication middleware
- [X] Webhook notification system

#### 4.3 Partner Dashboard

- [X] Order creation form
- [X] Orders list with filters
- [X] Order tracking page with Mapbox
- [X] Partner analytics dashboard

---

### **Phase 5: Order Assignment Engine** (Week 4)

#### 5.1 Assignment Logic

- [X] Create order assignment service
- [X] Redis GEO query for nearby agents
- [X] Agent scoring algorithm
- [X] Order offer system (top N agents)
- [X] First-accept assignment logic
- [X] Transaction locking (prevent double assignment)

#### 5.2 Real-time Notifications

- [X] WebSocket server setup
- [X] FCM push notification service
- [X] Order offer notifications to agents
- [X] Assignment confirmation to partners

---

### **Phase 6: Admin Module** (Week 5)

#### 6.1 Admin Dashboard

- [X] Overview metrics API
- [X] KPI cards component
- [X] Charts for orders, partners, agents
- [X] Real-time metrics updates (auto-refresh)
- [X] Time range filters
- [X] Export functionality (CSV/JSON)

#### 6.2 Live Map View

- [X] Mapbox integration
- [X] Fetch all agent locations from Redis
- [X] Display agents on map with filters
- [X] Agent detail popup on click
- [X] Real-time location updates (polling)
- [X] Agent status filters
- [X] Search functionality

#### 6.3 Agent Management

- [X] Agents list table
- [X] Agent approval/rejection
- [X] Agent blocking/suspension
- [X] Agent performance metrics
- [X] Agent detail page
- [X] Search and filter functionality
- [X] Pagination

#### 6.4 Partner Management

- [X] Partners list
- [X] Partner analytics (order counts)
- [X] Partner detail page
- [X] Search and filter functionality
- [ ] Partner configuration (API key management)
- [ ] Partner order heatmap

#### 6.5 Order Management

- [X] All orders list
- [X] Order details page
- [X] Force reassign functionality
- [X] Order cancellation
- [X] Status filters
- [X] Pagination

---

### **Phase 7: Real-time Features** (Week 5-6)

#### 7.1 WebSocket Implementation

- [X] Socket.io server setup
- [X] Client WebSocket hooks (useWebSocket)
- [X] Real-time order updates (order:offer events)
- [X] Connection management (auto-reconnect, status tracking)
- [ ] Real-time location streaming (admin map) - Using polling currently

#### 7.2 Location Tracking

- [X] Client-side location API usage
- [X] Periodic location updates (3-5 sec)
- [X] Redis GEO storage
- [ ] Location history (optional Postgres)

---

### **Phase 8: Analytics & Metrics** (Week 6)

#### 8.1 Analytics Service

- [X] Metrics computation service (in admin controller)
- [X] Daily stats aggregation
- [X] Partner-specific analytics (partner analytics page)
- [ ] Event logging system (comprehensive event tracking)

#### 8.2 Analytics APIs

- [X] GET /api/admin/metrics/overview
- [X] GET /api/admin/metrics/orders
- [X] GET /api/admin/metrics/partners
- [X] GET /api/admin/metrics/agents
- [X] GET /api/agent/metrics (agent dashboard KPIs)

#### 8.3 Analytics UI

- [X] Charts component (Recharts)
- [X] Time range filters
- [X] Export functionality (CSV/JSON)
- [X] Dashboard widgets (admin & partner dashboards)

---

### **Phase 9: Support System** (Week 7)

#### 9.1 Support Tickets

- [ ] Ticket creation API
- [ ] Ticket management (admin)
- [ ] Ticket status updates
- [ ] Ticket UI components

---

### **Phase 10: Polish & Optimization** (Week 7-8)

#### 10.1 Performance

- [ ] Database query optimization
- [ ] Redis caching strategy
- [ ] API response optimization
- [ ] Image optimization

#### 10.2 UI/UX

- [X] Responsive design (Tailwind CSS responsive classes)
- [X] Loading states (skeleton loaders, spinners)
- [X] Error boundaries (ErrorBoundary component)
- [X] Toast notifications (ToastProvider & useToast hook)
- [X] Skeleton loaders (Skeleton component with variants)

#### 10.3 Testing

- [ ] API endpoint testing
- [ ] Integration testing
- [ ] E2E testing (optional)

#### 10.4 Documentation

- [ ] API documentation
- [ ] Partner integration guide
- [ ] Deployment guide

---

## 🔧 Technical Implementation Details

### Order Assignment Algorithm

```typescript
// Pseudocode
1. Order created by partner
2. Query Redis GEO for agents within 5km of pickup
3. Filter: status = ONLINE, currentOrderId = null, isApproved = true
4. Score each agent:
   - Distance (shorter = higher score)
   - Payout preference (if agent prefers higher payouts)
   - Acceptance rate (higher = better)
   - Current load (if multiple orders queued)
5. Select top 3-5 agents
6. Send order offer via WebSocket + FCM
7. Wait for first acceptance (with timeout)
8. Lock order assignment (Redis/DB transaction)
9. Notify partner via webhook
10. Update agent status to ON_TRIP
```

### Location Tracking Flow

```typescript
// Client (Agent App)
1. User toggles ONLINE
2. Start geolocation watch (navigator.geolocation)
3. Every 3-5 seconds:
   - Get current position
   - POST /api/agent/location { lat, lng }
   - Update local state

// Server
1. Receive location update
2. Store in Redis GEO: GEOADD agents_locations lng lat agentId
3. Update agent.lastOnlineAt
4. Broadcast to admin map viewers (if any)
```

### WebSocket Events

```typescript
// Client → Server
- agent:online
- agent:offline
- agent:location (lat, lng)
- order:accept (orderId)
- order:reject (orderId)
- order:status_update (orderId, status)

// Server → Client
- order:new_offer (order details)
- order:assigned (orderId)
- order:status_changed (orderId, status)
- system:notification (message)
```

---

## 📦 Dependencies Installation Order

1. **Core Dependencies**

   ```bash
   npm install next-auth@beta @prisma/client prisma
   npm install ioredis
   npm install socket.io socket.io-client
   npm install mapbox-gl react-map-gl
   npm install firebase-admin
   npm install recharts
   npm install zod bcryptjs
   ```
2. **Type Definitions**

   ```bash
   npm install -D @types/bcryptjs @types/node
   ```

---

## 🔐 Environment Variables

See `.env.example` for complete list.

Key variables:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - App URL
- `MAPBOX_ACCESS_TOKEN` - Mapbox API key
- `FIREBASE_SERVICE_ACCOUNT` - FCM credentials

---

## 🚀 Deployment Considerations

- Database: PostgreSQL (managed service recommended)
- Redis: Managed Redis (AWS ElastiCache, Upstash, etc.)
- Hosting: Vercel (Next.js optimized) or self-hosted
- WebSocket: May need custom server setup (not serverless)
- File Storage: AWS S3 / Cloudinary for document uploads

---

## 📝 Next Steps

1. Review this plan
2. Start with Phase 1 (Foundation Setup)
3. Iterate feature by feature
4. Test each phase before moving to next

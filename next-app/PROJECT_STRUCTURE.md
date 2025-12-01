# Centralized Delivery Network - Project Structure

## 📁 Proposed Folder Structure

```
next-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (group route)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (agent)/                  # Agent routes (protected)
│   │   ├── agent/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx      # Main agent dashboard
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx       # Available orders list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Order details
│   │   │   ├── profile/
│   │   │   │   └── page.tsx       # Agent profile & documents
│   │   │   └── layout.tsx         # Agent layout with nav
│   │   └── layout.tsx             # Agent route group layout
│   │
│   ├── (partner)/                # Partner routes (protected)
│   │   ├── partner/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx       # Partner dashboard
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx       # Orders list
│   │   │   │   ├── create/
│   │   │   │   │   └── page.tsx   # Create new order
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Order tracking
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx       # Partner analytics
│   │   │   ├── settings/
│   │   │   │   └── page.tsx       # API keys, webhooks
│   │   │   └── layout.tsx         # Partner layout
│   │   └── layout.tsx             # Partner route group layout
│   │
│   ├── (admin)/                  # Admin routes (protected)
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx       # Admin overview
│   │   │   ├── map/
│   │   │   │   └── page.tsx       # Live agent map
│   │   │   ├── agents/
│   │   │   │   ├── page.tsx       # Agents management
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Agent details
│   │   │   ├── partners/
│   │   │   │   ├── page.tsx       # Partners management
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Partner details
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx       # All orders
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   # Order details
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx       # System analytics
│   │   │   └── layout.tsx         # Admin layout
│   │   └── layout.tsx             # Admin route group layout
│   │
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts       # NextAuth handler
│   │   │
│   │   ├── agent/
│   │   │   ├── location/
│   │   │   │   └── route.ts      # POST location updates
│   │   │   ├── status/
│   │   │   │   └── route.ts      # Toggle online/offline
│   │   │   ├── orders/
│   │   │   │   ├── route.ts      # GET available orders
│   │   │   │   ├── accept/
│   │   │   │   │   └── route.ts  # POST accept order
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts  # Update order status
│   │   │   └── profile/
│   │   │       └── route.ts      # GET/PUT profile
│   │   │
│   │   ├── partner/
│   │   │   ├── orders/
│   │   │   │   ├── route.ts      # POST create order
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts  # GET order details
│   │   │   ├── analytics/
│   │   │   │   └── route.ts      # GET partner metrics
│   │   │   └── webhook/
│   │   │       └── route.ts      # Webhook config
│   │   │
│   │   ├── admin/
│   │   │   ├── metrics/
│   │   │   │   ├── overview/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── orders/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── partners/
│   │   │   │   │   └── route.ts
│   │   │   │   └── agents/
│   │   │   │       └── route.ts
│   │   │   ├── agents/
│   │   │   │   ├── route.ts      # GET all agents
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts  # GET/PUT agent
│   │   │   │   │   ├── approve/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── block/
│   │   │   │   │       └── route.ts
│   │   │   │   └── locations/
│   │   │   │       └── route.ts  # GET all agent locations
│   │   │   └── orders/
│   │   │       ├── route.ts      # GET all orders
│   │   │       └── [id]/
│   │   │           └── reassign/
│   │   │               └── route.ts
│   │   │
│   │   └── websocket/
│   │       └── route.ts           # WebSocket upgrade handler
│   │
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── globals.css
│
├── lib/                           # Shared utilities
│   ├── auth/
│   │   ├── config.ts             # NextAuth config
│   │   ├── middleware.ts         # Auth middleware
│   │   └── roles.ts              # Role checking utilities
│   │
│   ├── db/
│   │   └── prisma.ts             # Prisma client instance
│   │
│   ├── redis/
│   │   └── client.ts             # Redis client & helpers
│   │
│   ├── websocket/
│   │   └── server.ts             # WebSocket server setup
│   │
│   ├── mapbox/
│   │   └── client.ts             # Mapbox API client
│   │
│   ├── fcm/
│   │   └── client.ts             # Firebase Cloud Messaging
│   │
│   ├── services/
│   │   ├── order-assignment.ts   # Order assignment logic
│   │   ├── location-service.ts   # Location tracking service
│   │   ├── notification-service.ts # Push notifications
│   │   └── analytics-service.ts # Analytics computation
│   │
│   └── utils/
│       ├── validation.ts         # Zod schemas
│       ├── errors.ts             # Error handling
│       └── constants.ts          # App constants
│
├── components/                    # React components
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   │
│   ├── agent/
│   │   ├── OnlineToggle.tsx
│   │   ├── OrderCard.tsx
│   │   ├── LocationTracker.tsx
│   │   └── OrderStatusUpdater.tsx
│   │
│   ├── partner/
│   │   ├── OrderForm.tsx
│   │   ├── OrderList.tsx
│   │   ├── OrderTracker.tsx      # Mapbox order tracking
│   │   └── MetricsCard.tsx
│   │
│   ├── admin/
│   │   ├── LiveMap.tsx           # Mapbox live agent map
│   │   ├── MetricsDashboard.tsx
│   │   ├── AgentTable.tsx
│   │   ├── OrderChart.tsx
│   │   └── AnalyticsCharts.tsx
│   │
│   └── shared/
│       ├── Map.tsx               # Reusable Mapbox component
│       ├── StatusBadge.tsx
│       └── LoadingSpinner.tsx
│
├── types/                         # TypeScript types
│   ├── auth.ts
│   ├── order.ts
│   ├── agent.ts
│   ├── partner.ts
│   └── api.ts
│
├── hooks/                         # Custom React hooks
│   ├── useWebSocket.ts
│   ├── useLocation.ts
│   ├── useOrders.ts
│   └── useAuth.ts
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed script
│
├── public/
│   └── ...                       # Static assets
│
├── .env.local                    # Environment variables
├── .env.example                  # Example env file
├── next.config.js
├── tsconfig.json
├── package.json
└── tailwind.config.ts
```

## 🔐 Route Protection Strategy

- Use Next.js middleware to protect routes based on roles
- Each route group `(agent)`, `(partner)`, `(admin)` will have its own layout with role checks
- API routes will validate roles using middleware functions

## 🔄 Real-time Architecture

- WebSocket server for real-time updates (order assignments, status changes)
- Redis GEO for fast location queries
- Periodic location updates from agent clients (every 3-5 seconds)
- Server-side event streaming for admin map updates

## 📦 Key Dependencies to Add

```json
{
  "next-auth": "^5.0.0",
  "@prisma/client": "^5.0.0",
  "prisma": "^5.0.0",
  "redis": "^4.6.0",
  "ioredis": "^5.3.0",
  "socket.io": "^4.7.0",
  "socket.io-client": "^4.7.0",
  "mapbox-gl": "^3.0.0",
  "react-map-gl": "^7.0.0",
  "firebase-admin": "^12.0.0",
  "recharts": "^2.10.0",
  "zod": "^3.22.0",
  "bcryptjs": "^2.4.3",
  "@types/bcryptjs": "^2.4.6"
}
```







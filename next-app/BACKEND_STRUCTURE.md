# Backend Structure (Separate API Server)

## 📁 Backend Folder Structure

```
backend/
├── src/
│   ├── server.ts                  # Main server entry point
│   │
│   ├── routes/                     # API route definitions
│   │   ├── index.ts               # Route aggregator
│   │   ├── auth.routes.ts         # Authentication routes
│   │   ├── agent.routes.ts        # Agent endpoints
│   │   ├── partner.routes.ts     # Partner endpoints
│   │   ├── admin.routes.ts       # Admin endpoints
│   │   └── websocket.routes.ts   # WebSocket setup
│   │
│   ├── controllers/               # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── agent.controller.ts
│   │   ├── partner.controller.ts
│   │   ├── admin.controller.ts
│   │   └── order.controller.ts
│   │
│   ├── services/                   # Business logic
│   │   ├── auth.service.ts
│   │   ├── order-assignment.service.ts
│   │   ├── location.service.ts
│   │   ├── notification.service.ts
│   │   └── analytics.service.ts
│   │
│   ├── middleware/                 # Middleware functions
│   │   ├── auth.middleware.ts     # JWT validation
│   │   ├── role.middleware.ts     # Role-based access
│   │   ├── validation.middleware.ts # Request validation
│   │   └── error.middleware.ts    # Error handling
│   │
│   ├── models/                     # Type definitions (from Prisma)
│   │   └── index.ts               # Re-export Prisma types
│   │
│   ├── utils/                      # Utilities
│   │   ├── jwt.util.ts
│   │   ├── password.util.ts
│   │   ├── errors.util.ts
│   │   └── constants.ts
│   │
│   ├── lib/                        # External library configs
│   │   ├── db.ts                  # Prisma client
│   │   ├── redis.ts               # Redis client
│   │   ├── socket.io.ts           # Socket.io server
│   │   └── fcm.ts                 # Firebase Admin
│   │
│   └── types/                      # TypeScript types
│       ├── auth.types.ts
│       ├── api.types.ts
│       └── express.types.ts       # Express type extensions
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── seed.ts                    # Seed script
│
├── .env                           # Environment variables
├── .env.example
├── package.json
├── tsconfig.json
└── nodemon.json                   # Development config
```

## 🔌 API Endpoints Structure

### Base URL: `http://localhost:5000/api`

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Agent Routes
- `GET /api/agent/profile` - Get agent profile
- `PUT /api/agent/profile` - Update profile
- `POST /api/agent/location` - Update location
- `POST /api/agent/status` - Toggle online/offline
- `GET /api/agent/orders` - Get available orders
- `POST /api/agent/orders/:id/accept` - Accept order
- `POST /api/agent/orders/:id/reject` - Reject order
- `PUT /api/agent/orders/:id/status` - Update order status

### Partner Routes
- `POST /api/partner/orders` - Create order
- `GET /api/partner/orders` - List orders
- `GET /api/partner/orders/:id` - Get order details
- `GET /api/partner/analytics` - Get analytics
- `PUT /api/partner/webhook` - Update webhook URL

### Admin Routes
- `GET /api/admin/metrics/overview` - System overview
- `GET /api/admin/metrics/orders` - Order metrics
- `GET /api/admin/metrics/partners` - Partner metrics
- `GET /api/admin/metrics/agents` - Agent metrics
- `GET /api/admin/agents` - List all agents
- `GET /api/admin/agents/:id` - Get agent details
- `POST /api/admin/agents/:id/approve` - Approve agent
- `POST /api/admin/agents/:id/block` - Block agent
- `GET /api/admin/agents/locations` - Get all agent locations
- `GET /api/admin/orders` - List all orders
- `POST /api/admin/orders/:id/reassign` - Force reassign order

### WebSocket
- `ws://localhost:5000` - WebSocket connection

## 🛠️ Backend Tech Stack

- **Framework**: Express.js or Fastify
- **Database**: Prisma + PostgreSQL
- **Cache/Geo**: Redis (ioredis)
- **WebSocket**: Socket.io
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Push**: Firebase Admin
- **Language**: TypeScript

## 📦 Backend Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@prisma/client": "^7.0.0",
    "prisma": "^6.19.0",
    "ioredis": "^5.8.2",
    "socket.io": "^4.8.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^3.0.3",
    "zod": "^4.1.12",
    "firebase-admin": "^13.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.3"
  }
}
```







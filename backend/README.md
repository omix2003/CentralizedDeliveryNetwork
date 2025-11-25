# Delivery Network Backend API

Backend API server for the Centralized Delivery Network application.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis server

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

4. Start development server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts          # Main server entry point
│   ├── routes/            # API route definitions
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Auth, validation, etc.
│   ├── lib/               # External library configs
│   └── utils/             # Utilities
├── prisma/
│   └── schema.prisma      # Database schema
└── package.json
```

## 🔌 API Endpoints

Base URL: `http://localhost:5000/api`

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

## 🛠️ Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## 🔐 Environment Variables

See `.env.example` for all required environment variables.

## 📝 License

ISC







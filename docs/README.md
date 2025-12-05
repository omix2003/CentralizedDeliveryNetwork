# Centralized Delivery Network

A comprehensive delivery management platform that connects partners, agents, and administrators in a unified ecosystem. This platform enables real-time order tracking, agent management, partner integrations, and administrative oversight.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### For Partners
- **REST API Integration**: Create and manage delivery orders via API
- **Webhook Support**: Receive real-time order status updates
- **Dashboard & Analytics**: Track orders, view metrics, and analyze performance
- **Order Management**: Create, track, and manage delivery orders
- **API Key Management**: Secure API key generation and rotation

### For Agents
- **Real-time Order Notifications**: Receive and accept delivery orders
- **Location Tracking**: Update and share real-time location
- **Order Management**: Accept, reject, and update order status
- **Profile Management**: Manage profile, documents, and KYC verification
- **Performance Metrics**: Track earnings, ratings, and order completion rates
- **Mobile-Optimized**: Responsive design with collapsible sidebar

### For Administrators
- **Live Map View**: Monitor all agents and orders in real-time
- **Agent Management**: Approve, block, and manage agents
- **Partner Management**: Manage partner accounts and integrations
- **Order Oversight**: View all orders and reassign when needed
- **KYC Verification**: Verify agent documents and approve accounts
- **Analytics Dashboard**: System-wide metrics and insights
- **Support Management**: Handle support tickets and issues

## 📁 Project Structure

```
NextJS/
├── backend/                    # Express.js API Server
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── lib/               # External library configs (Prisma, Redis, WebSocket)
│   │   └── utils/             # Utility functions
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Database migrations
│   └── uploads/               # File uploads (profiles, documents)
│
├── next-app/                  # Next.js Frontend Application
│   ├── app/                   # Next.js App Router pages
│   │   ├── (admin)/          # Admin routes
│   │   ├── (agent)/          # Agent routes
│   │   ├── (partner)/        # Partner routes
│   │   └── (auth)/           # Authentication routes
│   ├── components/            # React components
│   │   ├── layout/           # Layout components (Sidebar, Header)
│   │   ├── maps/             # Map components (Mapbox)
│   │   ├── orders/           # Order-related components
│   │   └── ui/               # Reusable UI components
│   ├── lib/                   # Utilities and API clients
│   │   ├── api/              # API client functions
│   │   └── utils/            # Helper functions
│   └── public/                # Static assets
│
└── docs/                      # Project documentation
    ├── API_DOCUMENTATION.md
    ├── DEPLOYMENT.md
    ├── PARTNER_INTEGRATION_GUIDE.md
    └── ...
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io (WebSocket)
- **Caching**: Redis (ioredis)
- **File Upload**: Multer
- **Push Notifications**: Firebase Admin SDK
- **Validation**: Zod, Express Validator

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **HTTP Client**: Axios
- **WebSocket**: Socket.io Client
- **Maps**: Mapbox GL, React Map GL
- **Charts**: Recharts
- **Authentication**: NextAuth.js v5
- **Validation**: Zod
- **Icons**: Lucide React

### Infrastructure
- **Database**: PostgreSQL
- **Cache**: Redis (optional)
- **File Storage**: Local filesystem (uploads directory)
- **Deployment**: 
  - Backend: Render.com
  - Frontend: Netlify

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **PostgreSQL** database (local or cloud)
- **Redis** (optional, for real-time features)
- **Git**

### Additional Requirements
- **Mapbox Access Token** (for map features)
- **Firebase Admin SDK** credentials (for push notifications, optional)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd NextJS
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Edit .env with your configuration
# See Configuration section below

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### 3. Frontend Setup

```bash
cd ../next-app

# Install dependencies
npm install

# Copy environment variables template
cp .env.local.example .env.local

# Edit .env.local with your configuration
# See Configuration section below
```

## ⚙️ Configuration

### Backend Environment Variables (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/delivery_network"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Redis (Optional)
REDIS_ENABLED=true
REDIS_URL="redis://localhost:6379"

# Firebase (Optional, for push notifications)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"
```

### Frontend Environment Variables (`next-app/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:5000/api"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-characters"

# Maps
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your-mapbox-access-token"
```

### Generate Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd next-app
npm run dev
```
Frontend will run on `http://localhost:3000`

### Production Mode

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd next-app
npm run build
npm start
```

## 📚 API Documentation

### Base URLs
- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-backend-url.onrender.com/api`

### Authentication

#### JWT Authentication (Web App)
```http
Authorization: Bearer <jwt_token>
```

#### API Key Authentication (Partner API)
```http
X-API-Key: pk_<your_api_key>
```

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/profile-picture` - Upload profile picture

**Agent:**
- `GET /api/agent/profile` - Get agent profile
- `GET /api/agent/orders` - Get available orders
- `POST /api/agent/orders/:id/accept` - Accept order
- `PUT /api/agent/orders/:id/status` - Update order status

**Partner:**
- `POST /api/partner-api/orders` - Create order (API key auth)
- `GET /api/partner/orders` - List orders (JWT auth)
- `GET /api/partner/analytics` - Get analytics

**Admin:**
- `GET /api/admin/metrics/overview` - System overview
- `GET /api/admin/agents` - List all agents
- `POST /api/admin/agents/:id/approve` - Approve agent

For complete API documentation, see [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md)

## 🚢 Deployment

### Quick Deployment

See [`docs/QUICK_DEPLOY.md`](./docs/QUICK_DEPLOY.md) for fast-track deployment instructions.

### Detailed Deployment Guide

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for comprehensive deployment instructions.

### Deployment Checklist

- **Backend**: [`docs/backend-deployment-checklist.md`](./docs/backend-deployment-checklist.md)
- **Frontend**: [`docs/frontend-deployment-checklist.md`](./docs/frontend-deployment-checklist.md)

### Partner Integration

For partner API integration, see [`docs/PARTNER_INTEGRATION_GUIDE.md`](./docs/PARTNER_INTEGRATION_GUIDE.md)

## 📖 Additional Documentation

All documentation is available in the [`docs/`](./docs/) directory:

- **API Documentation**: Complete API reference
- **Deployment Guides**: Step-by-step deployment instructions
- **Partner Integration**: Partner API integration guide
- **Performance**: Backend performance optimizations
- **Testing**: Testing guidelines

## 🧪 Development Scripts

### Backend Scripts
```bash
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm start                # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
```

### Frontend Scripts
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
```

## 🔒 Security

- **JWT Authentication**: Secure token-based authentication
- **API Key Authentication**: For partner integrations
- **Password Hashing**: bcryptjs for password security
- **CORS Protection**: Configurable CORS origins
- **Input Validation**: Zod and Express Validator
- **File Upload Validation**: Type and size restrictions
- **Environment Variables**: Sensitive data stored in .env files

## 🗄️ Database

The application uses PostgreSQL with Prisma ORM. Key models include:

- **User**: Authentication and user profiles
- **Agent**: Delivery agent profiles and status
- **Partner**: Partner accounts and API keys
- **Order**: Delivery orders and tracking
- **Document**: Agent KYC documents
- **SupportTicket**: Support ticket management

See `backend/prisma/schema.prisma` for the complete schema.

## 🌐 Real-time Features

- **WebSocket Support**: Real-time order updates via Socket.io
- **Location Tracking**: Real-time agent location updates
- **Order Notifications**: Push notifications for order status changes
- **Live Map**: Real-time map updates for admin dashboard

## 📱 Mobile Support

The frontend is fully responsive with:
- **Collapsible Sidebar**: Mobile-optimized navigation
- **Touch-Friendly UI**: Optimized for mobile interactions
- **Responsive Design**: Works on all screen sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

ISC

## 🆘 Support

For support and questions:
- Check the [documentation](./docs/)
- Review [API Documentation](./docs/API_DOCUMENTATION.md)
- See [Troubleshooting Guide](./docs/DEPLOYMENT.md#troubleshooting)

## 🎯 Roadmap

- [ ] Enhanced analytics and reporting
- [ ] Mobile app (React Native)
- [ ] Advanced route optimization
- [ ] Multi-language support
- [ ] Payment integration
- [ ] SMS notifications
- [ ] Advanced admin features

---

**Built with ❤️ using Next.js, Express.js, and TypeScript**






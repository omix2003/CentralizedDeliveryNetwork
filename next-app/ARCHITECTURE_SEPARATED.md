# Separated Backend & Frontend Architecture

## 🏗️ New Project Structure

```
NextJS/
├── backend/                         # Separate Backend API Server
│   ├── src/
│   │   ├── routes/                 # API routes
│   │   │   ├── auth/
│   │   │   ├── agent/
│   │   │   ├── partner/
│   │   │   ├── admin/
│   │   │   └── websocket/
│   │   ├── controllers/            # Request handlers
│   │   ├── services/               # Business logic
│   │   ├── middleware/             # Auth, validation, etc.
│   │   ├── models/                 # Prisma models (shared)
│   │   ├── utils/                  # Utilities
│   │   └── server.ts               # Express/Fastify server
│   ├── prisma/                     # Database schema (shared)
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── frontend/                       # Next.js Frontend (UI only)
    ├── app/                        # Next.js App Router
    │   ├── (auth)/
    │   ├── (agent)/
    │   ├── (partner)/
    │   ├── (admin)/
    │   └── layout.tsx
    ├── components/
    ├── lib/
    │   └── api/                    # API client (axios)
    ├── hooks/
    ├── types/
    ├── public/
    ├── package.json
    ├── tsconfig.json
    └── .env.local
```

## 🔄 Communication Flow

```
Frontend (Next.js)  ←→  HTTP/REST API  ←→  Backend (Express/Fastify)
                            ↓
                    WebSocket (Socket.io)
                            ↓
                    Real-time Updates
```

## 📦 Backend Responsibilities

- ✅ All API endpoints
- ✅ Database operations (Prisma)
- ✅ Redis operations
- ✅ WebSocket server
- ✅ Authentication logic
- ✅ Business logic (order assignment, etc.)
- ✅ Push notifications (FCM)
- ✅ Webhook handling

## 🎨 Frontend Responsibilities

- ✅ UI components
- ✅ Pages and routing
- ✅ Client-side state management
- ✅ API calls to backend
- ✅ WebSocket client connection
- ✅ Map rendering (Mapbox)
- ✅ Charts (Recharts)
- ✅ Form handling

## 🔐 Authentication Strategy

**Option 1: JWT Tokens (Recommended)**
- Backend generates JWT tokens
- Frontend stores token (localStorage/cookies)
- Frontend sends token in Authorization header
- Backend validates token on each request

**Option 2: Session-based**
- Backend manages sessions
- Frontend stores session cookie
- Backend validates session

## 📡 API Communication

Frontend will use **axios** to make HTTP requests to backend:

```typescript
// frontend/lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // http://localhost:5000/api
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## 🚀 Running the Application

**Development:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev  # Runs on port 5000

# Terminal 2 - Frontend
cd frontend
npm run dev  # Runs on port 3000
```

**Production:**
- Backend: Deploy to server (Node.js)
- Frontend: Deploy to Vercel/Netlify

## 📝 Environment Variables

**Backend (.env):**
```env
DATABASE_URL="..."
REDIS_URL="..."
JWT_SECRET="..."
PORT=5000
NODE_ENV=development
# ... other backend vars
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_WS_URL="ws://localhost:5000"
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="..."
```

## ✅ Benefits of Separation

1. **Clear Separation of Concerns**
2. **Independent Scaling** (scale backend/frontend separately)
3. **Technology Flexibility** (can change backend framework)
4. **Team Collaboration** (backend/frontend teams work independently)
5. **Better Testing** (test APIs independently)
6. **Reusability** (backend can serve mobile apps, other frontends)







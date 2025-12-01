# Frontend Structure (Next.js - UI Only)

## 📁 Frontend Folder Structure

```
frontend/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Auth pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (agent)/                    # Agent pages
│   │   ├── agent/
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   ├── profile/
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   │
│   ├── (partner)/                  # Partner pages
│   │   ├── partner/
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   ├── analytics/
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   │
│   ├── (admin)/                    # Admin pages
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── map/
│   │   │   ├── agents/
│   │   │   ├── partners/
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   │
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing page
│   └── globals.css
│
├── components/                     # React components
│   ├── ui/                        # Reusable UI components
│   ├── agent/                     # Agent-specific components
│   ├── partner/                   # Partner-specific components
│   ├── admin/                     # Admin-specific components
│   └── shared/                    # Shared components
│
├── lib/                           # Utilities
│   ├── api/                       # API client
│   │   ├── client.ts             # Axios instance
│   │   ├── auth.api.ts           # Auth endpoints
│   │   ├── agent.api.ts          # Agent endpoints
│   │   ├── partner.api.ts        # Partner endpoints
│   │   └── admin.api.ts          # Admin endpoints
│   │
│   ├── websocket/                 # WebSocket client
│   │   └── client.ts             # Socket.io client setup
│   │
│   ├── auth/                      # Auth utilities
│   │   ├── token.ts              # Token management
│   │   └── storage.ts             # LocalStorage/cookie helpers
│   │
│   └── utils/                     # General utilities
│       ├── constants.ts
│       └── helpers.ts
│
├── hooks/                         # Custom React hooks
│   ├── useAuth.ts                 # Authentication hook
│   ├── useApi.ts                  # API call hook
│   ├── useWebSocket.ts            # WebSocket hook
│   ├── useLocation.ts             # Geolocation hook
│   └── useOrders.ts               # Orders data hook
│
├── types/                         # TypeScript types
│   ├── api.types.ts               # API response types
│   ├── auth.types.ts
│   ├── order.types.ts
│   └── agent.types.ts
│
├── public/                        # Static assets
├── .env.local                     # Environment variables
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## 🔌 API Client Structure

### `lib/api/client.ts`
```typescript
// Axios instance with interceptors
// Handles token injection, error handling
```

### `lib/api/*.api.ts`
```typescript
// Separate files for each domain
// auth.api.ts, agent.api.ts, partner.api.ts, admin.api.ts
// Each exports functions that call backend endpoints
```

## 📦 Frontend Dependencies

```json
{
  "dependencies": {
    "next": "16.0.3",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "axios": "^1.13.2",
    "socket.io-client": "^4.8.1",
    "mapbox-gl": "^3.16.0",
    "react-map-gl": "^8.1.0",
    "recharts": "^3.4.1",
    "zod": "^4.1.12",
    "date-fns": "^4.1.0",
    "tailwindcss": "4.1.17"
  }
}
```

## 🔄 Frontend Responsibilities

1. **UI Rendering** - All React components and pages
2. **API Calls** - HTTP requests to backend using axios
3. **WebSocket Client** - Real-time updates via Socket.io client
4. **State Management** - React hooks, Context API (or Zustand/Redux if needed)
5. **Routing** - Next.js App Router
6. **Maps** - Mapbox integration for displaying maps
7. **Charts** - Recharts for analytics visualization
8. **Form Handling** - Form validation and submission

## 🚫 What Frontend Does NOT Do

- ❌ Database operations
- ❌ Business logic (order assignment, etc.)
- ❌ Redis operations
- ❌ Push notification sending
- ❌ Webhook handling
- ❌ Authentication logic (only token storage)

## 🔐 Authentication Flow (Frontend)

1. User submits login form
2. Frontend calls `POST /api/auth/login` to backend
3. Backend returns JWT token
4. Frontend stores token (localStorage or httpOnly cookie)
5. Frontend includes token in all subsequent API requests
6. Frontend uses token to check auth status

## 📡 WebSocket Client Flow

1. Frontend connects to `ws://localhost:5000` on mount
2. Sends authentication token on connection
3. Listens for events (new orders, status updates, etc.)
4. Updates UI in real-time based on events







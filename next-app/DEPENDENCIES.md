# Required Dependencies

## Core Dependencies to Install

```bash
# Authentication
npm install next-auth@beta

# Database
npm install @prisma/client prisma

# Redis
npm install ioredis

# WebSocket
npm install socket.io socket.io-client

# Maps
npm install mapbox-gl react-map-gl

# Push Notifications
npm install firebase-admin

# Charts
npm install recharts

# Validation & Utilities
npm install zod bcryptjs

# Date handling
npm install date-fns

# HTTP client (if needed)
npm install axios
```

## Dev Dependencies

```bash
# Type definitions
npm install -D @types/bcryptjs @types/node

# Development tools
npm install -D @types/react @types/react-dom
```

## Complete package.json additions

Add these to your existing `package.json` dependencies:

```json
{
  "dependencies": {
    "next-auth": "^5.0.0-beta.25",
    "@prisma/client": "^5.19.0",
    "prisma": "^5.19.0",
    "ioredis": "^5.3.2",
    "socket.io": "^4.7.5",
    "socket.io-client": "^4.7.5",
    "mapbox-gl": "^3.0.1",
    "react-map-gl": "^7.3.0",
    "firebase-admin": "^12.0.0",
    "recharts": "^2.12.0",
    "zod": "^3.23.0",
    "bcryptjs": "^2.4.3",
    "date-fns": "^3.3.1",
    "axios": "^1.6.7"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20.11.0"
  }
}
```

## Installation Command

Run this single command to install all dependencies:

```bash
npm install next-auth@beta @prisma/client prisma ioredis socket.io socket.io-client mapbox-gl react-map-gl firebase-admin recharts zod bcryptjs date-fns axios

npm install -D @types/bcryptjs @types/node
```

## Post-Installation Steps

1. **Prisma Setup**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

2. **Redis Setup**
   - Install Redis locally or use a cloud service
   - Update REDIS_URL in .env.local

3. **Mapbox Setup**
   - Create account at mapbox.com
   - Get access token
   - Add to NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

4. **Firebase Setup**
   - Create Firebase project
   - Generate service account key
   - Add credentials to .env.local







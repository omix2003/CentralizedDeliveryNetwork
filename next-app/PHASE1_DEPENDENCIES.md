# Phase 1 Dependencies - Installation Guide

Install these dependencies **one by one** in the order listed below. Each section explains what the package does.

---

## 📦 Installation Order

### **Step 1: Database & ORM**
**Purpose**: Database connection and type-safe queries

```bash
npm install @prisma/client prisma
```

**What it does:**
- `prisma` - CLI tool for database migrations and schema management
- `@prisma/client` - TypeScript client for database queries

**After installation**: We'll set up the Prisma schema and generate the client.

---

### **Step 2: Authentication**
**Purpose**: User authentication and session management

```bash
npm install next-auth@beta
```

**What it does:**
- NextAuth.js v5 (beta) - Handles login, registration, sessions, and role-based access

**Note**: We're using the beta version for Next.js 16 compatibility.

---

### **Step 3: Redis Client**
**Purpose**: Caching and geospatial queries for agent locations

```bash
npm install ioredis
```

**What it does:**
- Redis client for Node.js
- We'll use it for storing agent locations (GEO commands) and caching

---

### **Step 4: WebSocket (Real-time)**
**Purpose**: Real-time communication for order assignments and updates

```bash
npm install socket.io socket.io-client
```

**What it does:**
- `socket.io` - Server-side WebSocket implementation
- `socket.io-client` - Client-side WebSocket connection

**Used for**: Real-time order offers to agents, live location updates, status changes

---

### **Step 5: Maps Integration**
**Purpose**: Display maps and track locations

```bash
npm install mapbox-gl react-map-gl
```

**What it does:**
- `mapbox-gl` - Mapbox GL JS library
- `react-map-gl` - React wrapper for Mapbox

**Used for**: Admin live map, partner order tracking, agent location display

---

### **Step 6: Push Notifications**
**Purpose**: Send push notifications to mobile/web clients

```bash
npm install firebase-admin
```

**What it does:**
- Firebase Admin SDK for sending FCM (Firebase Cloud Messaging) push notifications

**Used for**: Notifying agents about new orders, order status updates

---

### **Step 7: Charts & Visualization**
**Purpose**: Display analytics and metrics

```bash
npm install recharts
```

**What it does:**
- React charting library built on D3.js

**Used for**: Admin dashboard charts, partner analytics, order trends

---

### **Step 8: Validation & Security**
**Purpose**: Input validation and password hashing

```bash
npm install zod bcryptjs
```

**What it does:**
- `zod` - TypeScript-first schema validation
- `bcryptjs` - Password hashing for secure storage

**Used for**: Validating API requests, hashing passwords during registration

---

### **Step 9: Utility Libraries**
**Purpose**: Date handling and HTTP requests

```bash
npm install date-fns axios
```

**What it does:**
- `date-fns` - Date utility functions (formatting, parsing, manipulation)
- `axios` - HTTP client for API calls (if needed for external integrations)

---

### **Step 10: Type Definitions (Dev Dependencies)**
**Purpose**: TypeScript type definitions

```bash
npm install -D @types/bcryptjs
```

**What it does:**
- TypeScript definitions for bcryptjs

**Note**: `@types/node` is already in your package.json, so we don't need to install it again.

---

## 📋 Quick Reference - All Commands

If you want to install all at once later, here's the complete command:

```bash
# Production dependencies
npm install @prisma/client prisma next-auth@beta ioredis socket.io socket.io-client mapbox-gl react-map-gl firebase-admin recharts zod bcryptjs date-fns axios

# Dev dependencies
npm install -D @types/bcryptjs
```

---

## ✅ Verification

After installing all dependencies, verify by checking your `package.json`. You should see all packages listed in the `dependencies` and `devDependencies` sections.

---

## 🎯 What's Next After Installation?

Once all dependencies are installed, we'll:

1. Set up Prisma schema and generate client
2. Create Redis client configuration
3. Set up NextAuth configuration
4. Create base folder structure
5. Set up environment variables

Let me know when you've installed all dependencies, and we'll proceed! 🚀







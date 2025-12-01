# Phase 1 Dependencies - Separated Architecture

Since we're keeping backend and frontend separate, here are the dependencies organized by **where they go**.

---

## 🔴 BACKEND Dependencies

Install these in the `backend/` folder:

### **Step 1: Framework & Server**
```bash
npm install express cors dotenv
npm install -D @types/express @types/cors @types/node
```

**What it does:**
- `express` - Web framework for Node.js
- `cors` - Enable CORS for frontend communication
- `dotenv` - Load environment variables

---

### **Step 2: Database & ORM**
```bash
npm install @prisma/client prisma
```

**What it does:**
- Database connection and type-safe queries
- **Only needed in backend** (frontend doesn't touch database)

---

### **Step 3: Authentication**
```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

**What it does:**
- `jsonwebtoken` - JWT token generation/validation
- `bcryptjs` - Password hashing

---

### **Step 4: Redis Client**
```bash
npm install ioredis
```

**What it does:**
- Redis client for caching and geospatial queries
- **Only needed in backend**

---

### **Step 5: WebSocket Server**
```bash
npm install socket.io
```

**What it does:**
- WebSocket server for real-time communication
- **Only server-side package** (client uses socket.io-client in frontend)

---

### **Step 6: Push Notifications**
```bash
npm install firebase-admin
```

**What it does:**
- Firebase Admin SDK for sending push notifications
- **Only needed in backend**

---

### **Step 7: Validation**
```bash
npm install zod express-validator
```

**What it does:**
- `zod` - Schema validation
- `express-validator` - Express middleware for validation

---

### **Step 8: Development Tools**
```bash
npm install -D typescript ts-node nodemon
```

**What it does:**
- TypeScript support
- Auto-reload during development

---

## 🟢 FRONTEND Dependencies

Install these in the `frontend/` folder (your current `next-app/`):

### **Step 1: HTTP Client**
```bash
npm install axios
```

**What it does:**
- Make API calls to backend
- **This is how frontend communicates with backend**

---

### **Step 2: WebSocket Client**
```bash
npm install socket.io-client
```

**What it does:**
- Connect to backend WebSocket server
- Receive real-time updates

---

### **Step 3: Maps Integration**
```bash
npm install mapbox-gl react-map-gl
```

**What it does:**
- Display maps and track locations
- **Frontend-only** (rendering)

---

### **Step 4: Charts & Visualization**
```bash
npm install recharts
```

**What it does:**
- Display analytics charts
- **Frontend-only** (visualization)

---

### **Step 5: Utilities**
```bash
npm install date-fns zod
```

**What it does:**
- `date-fns` - Date formatting
- `zod` - Client-side form validation

---

## 📋 Quick Reference

### Backend Installation (all at once)
```bash
cd backend
npm install express cors dotenv @prisma/client prisma jsonwebtoken bcryptjs ioredis socket.io firebase-admin zod express-validator
npm install -D @types/express @types/cors @types/node @types/jsonwebtoken @types/bcryptjs typescript ts-node nodemon
```

### Frontend Installation (all at once)
```bash
cd frontend  # or next-app
npm install axios socket.io-client mapbox-gl react-map-gl recharts date-fns zod
```

---

## ✅ What Goes Where

| Package | Backend | Frontend | Why |
|---------|---------|----------|-----|
| `express` | ✅ | ❌ | Server framework |
| `@prisma/client` | ✅ | ❌ | Database access |
| `ioredis` | ✅ | ❌ | Server-side caching |
| `socket.io` | ✅ | ❌ | WebSocket server |
| `socket.io-client` | ❌ | ✅ | WebSocket client |
| `firebase-admin` | ✅ | ❌ | Server sends push notifications |
| `axios` | ❌ | ✅ | Frontend makes API calls |
| `mapbox-gl` | ❌ | ✅ | Frontend renders maps |
| `recharts` | ❌ | ✅ | Frontend renders charts |
| `jsonwebtoken` | ✅ | ❌ | Server generates tokens |
| `bcryptjs` | ✅ | ❌ | Server hashes passwords |
| `zod` | ✅ | ✅ | Validation (both sides) |

---

## 🎯 Installation Order Recommendation

1. **First**: Set up backend folder structure
2. **Then**: Install backend dependencies
3. **Then**: Set up frontend folder structure  
4. **Finally**: Install frontend dependencies

This way you can test backend API independently before connecting frontend.

---

## 📝 Next Steps After Installation

1. **Backend**: Set up Express server, Prisma, Redis
2. **Frontend**: Set up API client, WebSocket client
3. **Connect**: Configure frontend to point to backend URL

Let me know when you're ready to proceed! 🚀







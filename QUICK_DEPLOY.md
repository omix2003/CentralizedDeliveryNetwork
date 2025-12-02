# Quick Deployment Guide

## 🚀 Fast Track Deployment

### Step 1: Backend on Render (5 minutes)

1. **Create PostgreSQL Database**:
   - Render Dashboard → New → PostgreSQL
   - Copy the **Internal Database URL**

2. **Create Web Service**:
   - Render Dashboard → New → Web Service
   - Connect GitHub repo
   - Settings:
     - **Root Directory**: `backend`
     - **Build Command**: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
     - **Start Command**: `npm run start`

3. **Set Environment Variables**:
   ```
   DATABASE_URL=<postgresql-internal-url>
   JWT_SECRET=<generate-using-command-below>
   CORS_ORIGIN=https://your-app.netlify.app (update after frontend deploy)
   NODE_ENV=production
   PORT=10000
   ```

4. **Generate Secrets**:
   ```bash
   # Run this to generate JWT_SECRET:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Deploy** → Copy the service URL (e.g., `https://delivery-network-backend.onrender.com`)

---

### Step 2: Frontend on Netlify (5 minutes)

1. **Create Site**:
   - Netlify Dashboard → Add new site → Import from Git
   - Connect GitHub repo

2. **Build Settings**:
   - **Base directory**: `next-app`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next` (auto-handled by Next.js plugin)

3. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   NEXTAUTH_URL=https://your-site.netlify.app (will be assigned)
   NEXTAUTH_SECRET=<same-as-JWT_SECRET-from-backend>
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-key>
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-mapbox-token>
   ```

4. **Deploy** → Copy the site URL

---

### Step 3: Update Backend CORS (1 minute)

1. Go back to Render dashboard
2. Update `CORS_ORIGIN` environment variable with your Netlify URL
3. Service will auto-redeploy

---

### Step 4: Verify (2 minutes)

✅ Backend health check: `https://your-backend.onrender.com/api/health`  
✅ Frontend loads  
✅ Login works  
✅ API calls succeed  

---

## 🔑 Environment Variables Cheat Sheet

### Backend (Render)
```
DATABASE_URL=<from-render-postgres>
JWT_SECRET=<32-char-hex-string>
CORS_ORIGIN=<netlify-url>
NODE_ENV=production
PORT=10000
```

### Frontend (Netlify)
```
NEXT_PUBLIC_API_URL=<render-backend-url>/api
NEXTAUTH_URL=<netlify-url>
NEXTAUTH_SECRET=<same-as-JWT_SECRET>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-token>
```

---

## ⚠️ Common Issues

**Backend build fails:**
- Check Node version is 20
- Verify DATABASE_URL is correct
- Check build logs

**Frontend can't connect to backend:**
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS_ORIGIN matches frontend URL exactly
- Check browser console for errors

**Database connection fails:**
- Use Internal Database URL (not External)
- Verify DATABASE_URL format
- Check database is running in Render

---

## 📚 Full Documentation

See `DEPLOYMENT.md` for detailed instructions and troubleshooting.





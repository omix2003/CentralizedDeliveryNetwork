# Quick Vercel Deployment Guide

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- All environment variables ready

## Quick Deploy (CLI Method)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Navigate to Backend Directory
```bash
cd backend
```

### Step 3: Login to Vercel
```bash
vercel login
```

### Step 4: Deploy (Preview)
```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Set project name (e.g., `delivery-network-backend-backup`)
- Confirm settings

### Step 5: Set Environment Variables

**Option A: Via CLI (Interactive)**
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add CORS_ORIGIN
vercel env add REDIS_ENABLED  # Set to "false" if not using Redis
```

**Option B: Via Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - `DATABASE_URL` (your PostgreSQL connection string)
   - `JWT_SECRET` (your JWT secret)
   - `CORS_ORIGIN` (your frontend URL, e.g., `https://your-app.netlify.app`)
   - `REDIS_ENABLED` (set to `false` if not using Redis)
   - `REDIS_URL` (only if using Redis)

### Step 6: Deploy to Production
```bash
vercel --prod
```

## Alternative: Deploy via GitHub

1. **Push your code to GitHub** (if not already)

2. **Go to Vercel Dashboard**: https://vercel.com/dashboard

3. **Import Project**:
   - Click "Add New Project"
   - Select your repository
   - **Important**: Set **Root Directory** to `backend`
   - Configure build settings:
     - **Framework Preset**: Other
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist` (not used but required)
     - **Install Command**: `npm install`

4. **Add Environment Variables** (same as Step 5 above)

5. **Deploy**

## Test Your Deployment

After deployment, test the health endpoint:
```bash
curl https://your-project.vercel.app/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Backend server is running",
  "redis": "disconnected"
}
```

## Important Notes

⚠️ **Vercel Limitations (as Backup):**
- ✅ API endpoints work
- ❌ WebSocket connections (disabled automatically)
- ❌ File uploads to local filesystem (use cloud storage)
- ⚠️ Long-running operations (max 30s on free tier)

✅ **This is perfect as a backup** - your primary deployment on Render will handle WebSocket and file uploads.

## Update Frontend to Use Backup

In your frontend, you can add fallback logic:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-render-backend.onrender.com';
const BACKUP_API_URL = 'https://your-vercel-backend.vercel.app';

// Try primary, fallback to Vercel
const apiClient = axios.create({
  baseURL: API_URL,
  // Add retry logic to fallback to BACKUP_API_URL
});
```

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure TypeScript compiles: `npm run build` locally
- Verify all dependencies are in `package.json`

### Function Timeout
- Optimize slow database queries
- Consider breaking operations into smaller chunks
- Upgrade to Vercel Pro for longer execution times (up to 5 minutes)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database firewall allows Vercel IPs
- Ensure database is accessible from the internet


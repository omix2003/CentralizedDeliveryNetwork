# Vercel Deployment Guide

This guide explains how to deploy the backend to Vercel as a serverless function.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. All environment variables configured

## Important Limitations

⚠️ **Vercel has some limitations for this backend:**

1. **WebSocket Support**: WebSocket connections are **NOT supported** on Vercel. The WebSocket server will be automatically disabled when running on Vercel.

2. **File Uploads**: The local filesystem is **ephemeral** on Vercel. Uploaded files will be lost when the serverless function terminates. For production use, you should:
   - Use cloud storage (AWS S3, Cloudinary, etc.)
   - Store file URLs in the database instead of local paths

3. **Long-running Processes**: Vercel functions have a maximum execution time (30 seconds on free tier, up to 5 minutes on Pro). Background jobs and periodic tasks may not work as expected.

4. **Database Migrations**: Run migrations manually or use a migration service. The `prestart` script won't run automatically.

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Set project name
   - Confirm settings

5. **Set Environment Variables**:
   ```bash
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add CORS_ORIGIN
   # ... add all other required environment variables
   ```

6. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push code to GitHub/GitLab/Bitbucket**

2. **Go to Vercel Dashboard**: https://vercel.com/dashboard

3. **Import Project**:
   - Click "Add New Project"
   - Select your repository
   - Set Root Directory to `backend`
   - Configure build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist` (not used, but required)
     - Install Command: `npm install`

4. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables:
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `CORS_ORIGIN`
     - `REDIS_URL` (if using Redis)
     - `REDIS_ENABLED` (set to `false` if not using Redis)
     - Any other environment variables your app needs

5. **Deploy**

## Environment Variables

Required environment variables for Vercel deployment:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Redis (optional)
REDIS_URL=redis://host:port
REDIS_ENABLED=true

# Vercel automatically sets these:
VERCEL=1
VERCEL_ENV=production
```

## Build Configuration

The `vercel.json` file is already configured:
- Routes all requests to `/api/index.ts`
- Sets max function duration to 30 seconds
- Uses `@vercel/node` builder

## Testing the Deployment

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

## Troubleshooting

### Build Fails

- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles: `npm run build`
- Check Vercel build logs for specific errors

### Function Timeout

- Increase `maxDuration` in `vercel.json` (requires Pro plan for > 30s)
- Optimize slow database queries
- Consider breaking long operations into smaller chunks

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database firewall allows Vercel IPs
- Ensure database is accessible from the internet

### File Upload Issues

- Files uploaded to `/uploads` will not persist
- Implement cloud storage solution (S3, Cloudinary, etc.)
- Update upload middleware to use cloud storage

## Production Recommendations

1. **Use Cloud Storage**: Replace local file uploads with S3, Cloudinary, or similar
2. **Database Connection Pooling**: Use a connection pooler (PgBouncer, Supabase, etc.)
3. **Monitor Function Execution**: Use Vercel Analytics to monitor performance
4. **Set Up Alerts**: Configure alerts for function errors and timeouts
5. **Use Vercel Pro**: For longer execution times and better performance

## Alternative: Keep Primary on Render

Since Vercel has limitations (WebSocket, file uploads), consider:
- **Primary deployment**: Render (full features)
- **Backup deployment**: Vercel (API-only, no WebSocket/file uploads)

Update your frontend to fallback to Vercel if Render is unavailable.


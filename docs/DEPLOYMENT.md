# Deployment Guide

This guide covers deploying the Delivery Network application:
- **Frontend (Next.js)**: Deploy to Netlify
- **Backend (Express)**: Deploy to Render

## ⚠️ IMPORTANT: Fix Submodule Issue First

If you see a Netlify error about `next-app` submodule, run this from the repository root:

```bash
# Remove submodule reference
git rm --cached next-app
git config -f .gitmodules --remove-section submodule.next-app 2>/dev/null || true
rm -rf .git/modules/next-app 2>/dev/null || true

# Add next-app as regular files
git add next-app/
git add .gitignore DEPLOYMENT.md QUICK_DEPLOY.md
git add backend/.gitignore backend/render.yaml backend/package.json
git add next-app/netlify.toml next-app/.gitignore

# Commit and push
git commit -m "Fix: Remove next-app submodule reference and add as regular files"
git push origin 1/12/2025
```

Or use the provided PowerShell script: `.\fix-submodule.ps1`

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Database**: Set up PostgreSQL database (Render PostgreSQL or external)
3. **Redis** (Optional): Set up Redis for real-time features (Render Redis or external)
4. **Accounts**:
   - Netlify account
   - Render account

---

## Part 1: Backend Deployment (Render)

### Step 1: Prepare Backend for Production

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create PostgreSQL Database on Render**:
   - Go to Render Dashboard → New → PostgreSQL
   - Note the **Internal Database URL** and **External Database URL**
   - Copy the connection string

3. **Run Prisma Migrations** (if needed):
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

### Step 2: Deploy Backend to Render

1. **Create New Web Service**:
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Select the repository

2. **Configure Service**:
   - **Name**: `delivery-network-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build && npx prisma generate`
   - **Start Command**: `npm run start`

3. **Set Environment Variables** in Render Dashboard:

   **Required:**
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<your-postgresql-connection-string>
   JWT_SECRET=<generate-a-strong-secret-key>
   CORS_ORIGIN=<your-netlify-frontend-url>
   ```

   **Optional:**
   ```
   REDIS_URL=<your-redis-connection-string>
   REDIS_ENABLED=true
   NEXTAUTH_SECRET=<same-as-frontend>
   NEXTAUTH_URL=<your-netlify-frontend-url>
   ```

4. **Generate Secrets**:
   ```bash
   # Generate JWT_SECRET (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate NEXTAUTH_SECRET (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for build to complete
   - Note the **Service URL** (e.g., `https://delivery-network-backend.onrender.com`)

### Step 3: Verify Backend Deployment

1. Check logs in Render dashboard
2. Test health endpoint: `https://your-backend-url.onrender.com/api/health`
3. Verify database connection

---

## Part 2: Frontend Deployment (Netlify)

### Step 1: Prepare Frontend for Production

1. **Update API URL**:
   - The frontend uses `NEXT_PUBLIC_API_URL` environment variable
   - This will be set in Netlify dashboard

2. **Build locally to test** (optional):
   ```bash
   cd next-app
   npm run build
   ```

### Step 2: Deploy Frontend to Netlify

1. **Connect Repository**:
   - Go to Netlify Dashboard → Add new site → Import from Git
   - Connect GitHub and select your repository

2. **Configure Build Settings**:
   - **Base directory**: `next-app`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next` (Netlify Next.js plugin handles this automatically)

3. **Set Environment Variables** in Netlify Dashboard:

   **Required:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   NEXTAUTH_URL=https://your-netlify-site.netlify.app
   NEXTAUTH_SECRET=<same-secret-as-backend>
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-mapbox-token>
   ```

   **Optional:**
   ```
   NODE_ENV=production
   ```

4. **Deploy**:
   - Click "Deploy site"
   - Wait for build to complete
   - Note your **Site URL** (e.g., `https://your-app.netlify.app`)

### Step 3: Update Backend CORS

1. Go back to Render dashboard
2. Update `CORS_ORIGIN` environment variable:
   ```
   CORS_ORIGIN=https://your-netlify-site.netlify.app
   ```
3. Redeploy backend (or it will auto-redeploy)

---

## Part 4: Post-Deployment Checklist

### Backend (Render)
- [ ] Database migrations completed
- [ ] Environment variables set
- [ ] Health endpoint responding
- [ ] CORS configured correctly
- [ ] File uploads working (check uploads directory)
- [ ] Redis connected (if enabled)

### Frontend (Netlify)
- [ ] Build successful
- [ ] Environment variables set
- [ ] API connection working
- [ ] Authentication working
- [ ] Maps loading correctly
- [ ] Static files serving correctly

### Integration
- [ ] Frontend can connect to backend API
- [ ] Authentication flow works end-to-end
- [ ] WebSocket connections work (if using)
- [ ] File uploads work
- [ ] All API endpoints accessible

---

## Environment Variables Summary

### Backend (Render)
```
NODE_ENV=production
PORT=10000
DATABASE_URL=<postgresql-connection-string>
JWT_SECRET=<32-char-secret>
CORS_ORIGIN=<netlify-frontend-url>
REDIS_URL=<redis-connection-string> (optional)
REDIS_ENABLED=true (optional)
```

### Frontend (Netlify)
```
NEXT_PUBLIC_API_URL=<render-backend-url>/api
NEXTAUTH_URL=<netlify-frontend-url>
NEXTAUTH_SECRET=<32-char-secret>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<google-maps-key>
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<mapbox-token>
```

---

## Troubleshooting

### Backend Issues

**Build fails:**
- Check Node version (should be 20)
- Verify all dependencies in package.json
- Check build logs in Render

**Database connection fails:**
- Verify DATABASE_URL is correct
- Check if database is accessible from Render
- Run migrations: `npx prisma migrate deploy`

**CORS errors:**
- Verify CORS_ORIGIN matches frontend URL exactly
- Check backend logs for CORS errors

### Frontend Issues

**Build fails:**
- Check Node version
- Verify all environment variables are set
- Check build logs in Netlify

**API connection fails:**
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS settings in backend
- Check browser console for errors

**Authentication not working:**
- Verify NEXTAUTH_SECRET matches backend
- Check NEXTAUTH_URL is correct
- Verify session configuration

---

## Continuous Deployment

Both Netlify and Render support automatic deployments:
- **Netlify**: Auto-deploys on push to main branch
- **Render**: Auto-deploys on push to main branch

To disable auto-deploy, configure in respective dashboards.

---

## Custom Domains

### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Follow DNS configuration instructions

### Render
1. Go to Service settings → Custom Domains
2. Add custom domain
3. Update DNS records
4. Update CORS_ORIGIN in environment variables

---

## Monitoring

- **Render**: Check service logs in dashboard
- **Netlify**: Check deploy logs and function logs
- **Database**: Monitor in Render PostgreSQL dashboard
- **Redis**: Monitor in Render Redis dashboard (if using)

---

## Security Notes

1. **Never commit** `.env` files to Git
2. **Use strong secrets** for JWT_SECRET and NEXTAUTH_SECRET
3. **Enable HTTPS** (automatic on both platforms)
4. **Set up rate limiting** if needed
5. **Regularly update dependencies**
6. **Monitor logs** for suspicious activity

---

## Support

- Netlify Docs: https://docs.netlify.com
- Render Docs: https://render.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment


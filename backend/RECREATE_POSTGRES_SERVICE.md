# Recreate PostgreSQL Service on Render

This guide shows how to delete the existing PostgreSQL database service and create a new one, then reconnect your backend.

⚠️ **WARNING**: This will **DELETE ALL DATA** in your current database!

## Step-by-Step Process

### Step 1: Delete Existing PostgreSQL Service

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Find your PostgreSQL service**:
   - Look for a service with type "PostgreSQL"
   - Usually named something like `delivery-network-db` or similar

3. **Delete the service**:
   - Click on the PostgreSQL service
   - Go to **Settings** tab
   - Scroll down to **Danger Zone**
   - Click **Delete Service**
   - Confirm deletion (this cannot be undone!)

### Step 2: Create New PostgreSQL Service

1. **Create new PostgreSQL database**:
   - In Render Dashboard, click **New +** → **PostgreSQL**

2. **Configure the database**:
   - **Name**: `delivery-network-db` (or your preferred name)
   - **Database**: `delivery_network` (or your preferred name)
   - **User**: Auto-generated (or custom)
   - **Region**: Choose the same region as your backend service
   - **PostgreSQL Version**: Latest stable (recommended)
   - **Plan**: Choose your plan (Free tier available)

3. **Create the service**:
   - Click **Create PostgreSQL**
   - Wait for the database to be provisioned (1-2 minutes)

### Step 3: Get New Database Connection String

1. **Copy the connection string**:
   - Once created, click on your new PostgreSQL service
   - Go to **Info** tab
   - Find **Internal Database URL** (for services in same region)
   - Or **External Database URL** (for external connections)
   - **Copy the full connection string**

   Example format:
   ```
   postgresql://user:password@hostname:5432/database_name
   ```

### Step 4: Update Backend Service Environment Variables

1. **Go to your Backend Web Service**:
   - In Render Dashboard, find your backend service (e.g., `delivery-network-backend`)

2. **Update Environment Variables**:
   - Go to **Environment** tab
   - Find `DATABASE_URL` variable
   - Click **Edit** or **Add** if it doesn't exist
   - Paste the new connection string from Step 3
   - Click **Save Changes**

3. **Verify other environment variables are still set**:
   - `JWT_SECRET`
   - `CORS_ORIGIN`
   - `NODE_ENV=production`
   - `PORT=10000`
   - `REDIS_URL` (if using Redis)
   - `REDIS_ENABLED` (if using Redis)

### Step 5: Redeploy Backend Service

1. **Trigger a new deployment**:
   - Go to your backend service
   - Click **Manual Deploy** → **Deploy latest commit**
   - Or push a new commit to trigger auto-deploy

2. **Watch the deployment logs**:
   - The build process will:
     1. Install dependencies
     2. Generate Prisma Client
     3. Run `npx prisma migrate deploy` (applies all migrations)
     4. Start the server

3. **Verify migration success**:
   - Check build logs for: `✅ All migrations have been successfully applied`
   - If you see errors, check the logs for details

### Step 6: Verify Database is Working

1. **Test the health endpoint**:
   ```bash
   curl https://your-backend.onrender.com/health
   ```

2. **Check database connection**:
   - Should see: `"status": "ok"` in response
   - Check backend logs for: `✅ Prisma Client connected successfully`

3. **Verify migrations applied**:
   - All tables should be created
   - You can use Prisma Studio locally to verify:
     ```bash
     cd backend
     DATABASE_URL="your-new-connection-string" npx prisma studio
     ```

## Alternative: Using Render's Database Linking

If your backend and database are in the same Render account:

1. **Link the database to your service**:
   - Go to your backend service
   - Go to **Environment** tab
   - Click **Add Environment Variable**
   - Select **Add from Render PostgreSQL**
   - Choose your new PostgreSQL service
   - This automatically adds `DATABASE_URL` with the internal connection string

## Troubleshooting

### Error: "Database does not exist"
- Make sure the database name in the connection string matches what you created
- Check the PostgreSQL service info tab for the correct database name

### Error: "Connection refused" or "Connection timeout"
- Use **Internal Database URL** if backend and database are in same region
- Use **External Database URL** if connecting from outside Render
- Check firewall/network settings

### Error: "Migration failed"
- Check that all migration files are in `backend/prisma/migrations/`
- Verify the database user has CREATE/ALTER permissions
- Check build logs for specific migration errors

### Error: "Authentication failed"
- Verify the username and password in the connection string
- Check that the database user has proper permissions

## Important Notes

- **Backup First**: If you have important data, export it before deleting:
  ```bash
  pg_dump -h <host> -U <user> -d <database> > backup.sql
  ```

- **Connection Strings**:
  - **Internal URL**: Faster, only works within Render network
  - **External URL**: Works from anywhere, but slower

- **Environment Variables**: Make sure to update `DATABASE_URL` in:
  - Render dashboard (for production)
  - Local `.env` file (for development)
  - Any other deployment platforms (Vercel, etc.)

- **Migration Order**: All migrations will be applied in order automatically when the backend starts

## Quick Checklist

- [ ] Deleted old PostgreSQL service
- [ ] Created new PostgreSQL service
- [ ] Copied new connection string
- [ ] Updated `DATABASE_URL` in backend service
- [ ] Verified other environment variables
- [ ] Triggered backend redeployment
- [ ] Verified migrations applied successfully
- [ ] Tested health endpoint
- [ ] Verified database connection in logs


# Troubleshooting Network Errors

## Problem
You're seeing "Network Error" when trying to access agent endpoints like:
- `/agent/profile`
- `/agent/metrics`
- `/agent/status`

## Common Causes

### 1. Backend Server Not Running
The most common cause is that the backend server is not running.

**Solution:**
```bash
# Navigate to backend directory
cd backend

# Start the backend server
npm run dev
```

The backend should be running on `http://localhost:5000`

### 2. Wrong API URL
Check that your `.env.local` file in the `next-app` directory has the correct API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Port Conflict
If port 5000 is already in use, you'll need to either:
- Stop the process using port 5000
- Change the backend port in `backend/.env` and update `NEXT_PUBLIC_API_URL` accordingly

**Check if port 5000 is in use:**
```bash
# Windows PowerShell
netstat -ano | findstr :5000

# Or check what's using the port
Get-NetTCPConnection -LocalPort 5000
```

### 4. CORS Issues
If you see CORS errors in the browser console, check the backend CORS configuration in `backend/src/app.ts` or `backend/src/server.ts`.

### 5. Firewall/Antivirus
Sometimes firewalls or antivirus software can block localhost connections. Try temporarily disabling them to test.

## How to Verify Backend is Running

1. **Check the terminal** where you started the backend - you should see:
   ```
   Server running on port 5000
   ```

2. **Test the API directly** in your browser or using curl:
   ```bash
   # This should return an error (401 Unauthorized) but confirms server is running
   curl http://localhost:5000/api/agent/profile
   ```

3. **Check backend logs** for any startup errors

## Improved Error Messages

I've updated the error handling to provide more helpful messages. Now when a network error occurs, you'll see:
- "Cannot connect to backend server at http://localhost:5000/api. Please make sure the backend server is running on port 5000."

This makes it clear that the backend needs to be started.

## Quick Fix Steps

1. **Open a new terminal/command prompt**
2. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
3. **Start the backend:**
   ```bash
   npm run dev
   ```
4. **Wait for the server to start** (you should see "Server running on port 5000")
5. **Refresh your frontend application**

## Still Having Issues?

1. Check the backend terminal for error messages
2. Verify your database connection (PostgreSQL should be running)
3. Check that Redis is running (if using location features)
4. Review the backend logs for specific error messages






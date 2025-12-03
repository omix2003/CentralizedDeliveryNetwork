# Environment Variables Reference

Create a `.env.local` file in the `next-app/` directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/delivery_network?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# Redis
REDIS_URL="redis://localhost:6379"
# Or for Redis with password:
# REDIS_URL="redis://:password@localhost:6379"

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your-mapbox-access-token"

# Firebase Cloud Messaging (FCM)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# App Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: File Upload (if using S3/Cloudinary)
# AWS_ACCESS_KEY_ID=""
# AWS_SECRET_ACCESS_KEY=""
# AWS_S3_BUCKET_NAME=""
# Or
# CLOUDINARY_CLOUD_NAME=""
# CLOUDINARY_API_KEY=""
# CLOUDINARY_API_SECRET=""

# Optional: Email Service (for notifications)
# SMTP_HOST=""
# SMTP_PORT=""
# SMTP_USER=""
# SMTP_PASSWORD=""
```

## How to Generate NEXTAUTH_SECRET

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Getting API Keys

### Mapbox
1. Go to https://mapbox.com
2. Sign up for free account
3. Navigate to Account → Access Tokens
4. Copy your default public token

### Firebase
1. Go to https://console.firebase.google.com
2. Create a new project
3. Go to Project Settings → Service Accounts
4. Generate new private key (JSON file)
5. Extract values from JSON:
   - `project_id` → FIREBASE_PROJECT_ID
   - `private_key` → FIREBASE_PRIVATE_KEY
   - `client_email` → FIREBASE_CLIENT_EMAIL

### PostgreSQL
- Local: Install PostgreSQL and create database
- Cloud: Use services like Supabase, Neon, or Railway

### Redis
- Local: Install Redis locally
- Cloud: Use Upstash (free tier), AWS ElastiCache, or Redis Cloud







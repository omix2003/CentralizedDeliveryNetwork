# PostgreSQL Service Configuration Guide

## Suggested Service Names and Configuration

### Option 1: Production Service (Recommended)
```
Service Name: delivery-network-db
Database Name: delivery_network
User: delivery_user (or auto-generated)
Region: Same as your backend service
Plan: Free (or paid if needed)
PostgreSQL Version: 16 (latest stable)
```

### Option 2: With Date/Version Identifier
```
Service Name: delivery-network-db-2025
Database Name: delivery_network
User: delivery_user
Region: Same as your backend service
Plan: Free
PostgreSQL Version: 16
```

### Option 3: Environment-Specific
```
Service Name: delivery-network-db-prod
Database Name: delivery_network_prod
User: delivery_user
Region: Same as your backend service
Plan: Free
PostgreSQL Version: 16
```

## Complete Configuration Checklist

### Service Details
- **Service Name**: `delivery-network-db`
- **Database Name**: `delivery_network`
- **User**: Auto-generated (or custom: `delivery_user`)
- **Region**: 
  - **US East (Ohio)** - `us-east-2`
  - **US West (Oregon)** - `us-west-2`
  - **EU (Ireland)** - `eu-west-1`
  - **Asia Pacific (Singapore)** - `ap-southeast-1`
  - Choose the same region as your backend service for best performance

### Plan Selection
- **Free Tier**: 
  - 90 days free trial
  - 1 GB storage
  - Good for development/testing
- **Starter Plan**: $7/month
  - 10 GB storage
  - Better for production
- **Standard Plan**: $20/month
  - 25 GB storage
  - High availability

### PostgreSQL Version
- **Recommended**: PostgreSQL 16 (latest stable)
- **Alternative**: PostgreSQL 15 (if compatibility needed)

## Connection String Format

After creation, you'll get a connection string like:

```
Internal Database URL:
postgresql://delivery_user:password@dpg-xxxxx-a/delivery_network

External Database URL:
postgresql://delivery_user:password@dpg-xxxxx-a.oregon-postgres.render.com/delivery_network
```

## Environment Variables to Set

After creating the database, update these in your backend service:

```env
DATABASE_URL=postgresql://user:password@host:5432/delivery_network
JWT_SECRET=<your-existing-secret>
CORS_ORIGIN=https://your-frontend.netlify.app
NODE_ENV=production
PORT=10000
REDIS_ENABLED=false
```

## Quick Reference

### Service Naming Convention
- Use lowercase
- Use hyphens, not underscores
- Keep it descriptive: `delivery-network-db`
- Add environment suffix if needed: `delivery-network-db-prod`

### Database Naming Convention
- Use lowercase
- Use underscores: `delivery_network`
- Keep it simple and descriptive

### Region Selection
- **Same region as backend** = Faster (use Internal URL)
- **Different region** = Slower (use External URL)
- **US East** = Good default for US-based apps
- **EU** = Good for European users

## Example: Complete Setup

1. **Service Name**: `delivery-network-db`
2. **Database**: `delivery_network`
3. **Region**: `us-east-2` (or same as backend)
4. **Plan**: Free (or Starter for production)
5. **PostgreSQL Version**: 16
6. **Connection**: Use Internal Database URL
7. **Environment Variable**: `DATABASE_URL` = Internal URL

## Security Notes

- **Internal URL**: Only accessible within Render network (more secure)
- **External URL**: Accessible from anywhere (less secure, but needed for external tools)
- **Password**: Auto-generated, save it securely
- **User**: Auto-generated or custom (must be unique)

## Backup Recommendations

After setup, consider:
- Enable automatic backups (if on paid plan)
- Set up manual backup schedule
- Document the connection string securely


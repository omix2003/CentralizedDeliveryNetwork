# Backend Deployment Checklist for Render

## Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] All environment variables documented
- [ ] Database migrations tested locally
- [ ] Build process tested locally (`npm run build`)

## Render Setup

- [ ] PostgreSQL database created on Render
- [ ] Database URL copied
- [ ] Redis instance created (if needed)
- [ ] Web service created on Render
- [ ] GitHub repository connected

## Environment Variables

Set these in Render dashboard:

- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `DATABASE_URL=<postgresql-connection-string>`
- [ ] `JWT_SECRET=<strong-secret-key>`
- [ ] `CORS_ORIGIN=<netlify-frontend-url>`
- [ ] `REDIS_URL=<redis-connection-string>` (if using Redis)
- [ ] `REDIS_ENABLED=true` (if using Redis)

## Build Configuration

- [ ] Root Directory: `backend`
- [ ] Build Command: `npm install && npx prisma generate && npm run build && npx prisma migrate deploy`
- [ ] Start Command: `npm run start`

## Post-Deployment

- [ ] Service is running (check logs)
- [ ] Database migrations applied (`npx prisma migrate deploy` - run manually if needed)
- [ ] Health endpoint accessible
- [ ] API endpoints responding
- [ ] CORS configured correctly
- [ ] File uploads working

## Manual Steps (if needed)

If automatic migrations don't work, SSH into Render and run:
```bash
npx prisma migrate deploy
npx prisma generate
```





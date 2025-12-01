# Frontend Deployment Checklist for Netlify

## Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] All environment variables documented
- [ ] Build tested locally (`npm run build`)
- [ ] Backend URL known (from Render deployment)

## Netlify Setup

- [ ] Netlify account created
- [ ] GitHub repository connected
- [ ] Site created on Netlify

## Build Configuration

- [ ] Base directory: `next-app`
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.next` (handled by Next.js plugin)

## Environment Variables

Set these in Netlify dashboard (Site settings → Environment variables):

- [ ] `NEXT_PUBLIC_API_URL=<render-backend-url>/api`
- [ ] `NEXTAUTH_URL=<netlify-site-url>`
- [ ] `NEXTAUTH_SECRET=<same-as-backend>`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>`
- [ ] `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-token>`

## Post-Deployment

- [ ] Build successful
- [ ] Site accessible
- [ ] API connection working (check browser console)
- [ ] Authentication working
- [ ] Maps loading correctly
- [ ] All pages accessible

## Update Backend CORS

After getting Netlify URL:
- [ ] Update `CORS_ORIGIN` in Render to match Netlify URL
- [ ] Redeploy backend (or wait for auto-redeploy)


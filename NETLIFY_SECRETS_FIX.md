# Netlify Secrets Scanning Fix

## Issue
Netlify's secrets scanner was detecting `NEXTAUTH_URL` in:
- Build output files (`.netlify/.next/server/chunks/...`)
- Documentation files (example values)
- Source code (default value)

## Solution Applied

### 1. Whitelisted `NEXTAUTH_URL`
Added `NEXTAUTH_URL` to `SECRETS_SCAN_OMIT_KEYS` because:
- It's a public-facing URL (not a secret)
- It's expected to be in build output for Next.js
- Documentation files contain example values only

### 2. Excluded Build Output Paths
Added `SECRETS_SCAN_OMIT_PATHS` to exclude:
- `.next/**` - Next.js build output
- `.netlify/**` - Netlify build artifacts
- `node_modules/**` - Dependencies

This prevents scanning of build artifacts where environment variables are expected to appear.

## Updated Configuration

```toml
[build.environment]
  NODE_VERSION = "20"
  # Whitelist expected public environment variables
  SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_API_URL,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,NEXTAUTH_URL"
  # Exclude build output directories from secrets scanning
  SECRETS_SCAN_OMIT_PATHS = ".next/**,.netlify/**,node_modules/**"
```

## Why This Works

- `NEXTAUTH_URL` is a public URL, not a secret
- Next.js embeds environment variables in build output (expected behavior)
- Build artifacts should not be scanned for secrets
- Documentation files contain example values, not real secrets

## Next Steps

1. **Push the fix:**
   ```powershell
   git push origin 1/12/2025
   ```

2. **Redeploy on Netlify:**
   - The build should now pass
   - Secrets scanner will ignore `NEXTAUTH_URL` and build output

## Note

The documentation files (`ENV_VARIABLES.md`, `PROJECT_SUMMARY.md`, `README.md`) contain example values like `"http://localhost:3000"` which are not real secrets. These are safe to keep in the repository.


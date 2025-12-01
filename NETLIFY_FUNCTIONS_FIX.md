# Netlify Functions Directory Fix

## Problem
Netlify was trying to use `next-app/netlify.toml` as the functions directory, which is incorrect because:
- `netlify.toml` is a configuration file, not a directory
- Next.js apps use API routes, not Netlify Functions

## Solution

### Option 1: Remove Functions Directory (Recommended for Next.js)

Since Next.js has its own API routes (`app/api/`), we don't need Netlify Functions.

**In Netlify Dashboard:**
1. Go to Site settings → Build & deploy → Functions
2. Clear or remove the "Functions directory" field
3. Leave it blank
4. Save

### Option 2: Update netlify.toml (If you need functions later)

If you want to use Netlify Functions in the future, create a directory and update the config:

```toml
[functions]
  directory = "netlify/functions"
```

But for now, **Option 1 is recommended** since Next.js handles API routes natively.

## Files Changed

- ✅ `next-app/netlify.toml` - Added `base = "next-app"` for clarity

## Next Steps

1. **Push the fix:**
   ```powershell
   git push origin 1/12/2025
   ```

2. **Update Netlify Site Settings:**
   - Go to Netlify Dashboard
   - Site settings → Build & deploy → Functions
   - Clear the "Functions directory" field (remove `next-app/netlify.toml`)
   - Save

3. **Redeploy:**
   - Trigger a new deploy
   - Build should now succeed

## Why This Happened

Netlify may have auto-detected or you may have accidentally set the functions directory to the config file path. Since Next.js uses its own API routes, we don't need Netlify Functions.


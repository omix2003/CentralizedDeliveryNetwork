# 🔒 Secrets Rotation Guide

## ⚠️ CRITICAL: Secrets Were Exposed

The `backend/.env` file was committed to the repository and contained actual secrets:
- `DATABASE_URL` with database credentials
- `JWT_SECRET` 
- Other sensitive values

**These secrets are now in your Git history and must be rotated immediately.**

## 🔄 Required Actions

### 1. Rotate All Exposed Secrets

#### Database (DATABASE_URL)
- **Change database password** in PostgreSQL
- Update `DATABASE_URL` in:
  - Netlify environment variables
  - Render environment variables
  - Local `.env` files

#### JWT_SECRET
- **Generate new secret:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Update in:
  - Netlify environment variables
  - Render environment variables
  - Local `.env` files

#### NEXTAUTH_SECRET
- **Generate new secret:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Update in:
  - Netlify environment variables
  - Render environment variables
  - Local `.env` files

### 2. Purge Secrets from Git History (Recommended)

The secrets are still in Git history. To remove them completely:

#### Option A: Using BFG Repo Cleaner (Recommended)

1. **Install BFG:**
   ```bash
   # Download from https://rtyley.github.io/bfg-repo-cleaner/
   # Or use: brew install bfg (Mac) / choco install bfg (Windows)
   ```

2. **Create a mirror clone:**
   ```bash
   git clone --mirror https://github.com/omix2003/CentralizedDeliveryNetwork.git repo.git
   cd repo.git
   ```

3. **Remove .env files from history:**
   ```bash
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

4. **Force push (⚠️ This rewrites history):**
   ```bash
   git push --force
   ```

#### Option B: Using git filter-repo

```bash
git filter-repo --path backend/.env --invert-paths
git push --force
```

### 3. Verify .gitignore

✅ Already verified:
- `backend/.gitignore` includes `.env`
- `next-app/.gitignore` includes `.env`
- Root `.gitignore` includes `.env`

### 4. Update Environment Variables

#### Netlify Dashboard:
1. Go to Site settings → Environment variables
2. Update:
   - `NEXTAUTH_SECRET` (new value)
   - `DATABASE_URL` (if used, with new password)
   - `NEXT_PUBLIC_API_URL` (if changed)

#### Render Dashboard:
1. Go to Service → Environment
2. Update:
   - `JWT_SECRET` (new value)
   - `DATABASE_URL` (with new password)
   - `NEXTAUTH_SECRET` (new value, if used)

### 5. Redeploy

After rotating secrets:
1. **Backend (Render):**
   - Environment variables updated
   - Service will auto-redeploy

2. **Frontend (Netlify):**
   - Environment variables updated
   - Trigger new deploy

## ✅ Prevention Checklist

- [x] `.env` files removed from Git tracking
- [x] `.gitignore` includes `.env` patterns
- [ ] Secrets rotated in all environments
- [ ] Git history purged (optional but recommended)
- [ ] Environment variables updated in Netlify
- [ ] Environment variables updated in Render
- [ ] Services redeployed

## 📝 Notes

- The `backend/.env` file has been removed from Git tracking
- The file still exists locally but won't be committed
- **All users with access to the repository should rotate their local secrets**
- Consider using a secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault) for production

## 🔗 Resources

- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git filter-repo](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)





# How to Change Vercel Deployment Branch

Vercel can deploy from any branch. Here are the methods to change the deployment branch:

## Method 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Select your project**

3. **Go to Settings** → **Git**

4. **Change Production Branch**:
   - Find the "Production Branch" section
   - Click on the branch dropdown (currently showing "main")
   - Select the branch you want to deploy (e.g., `1/12/2025`, `2/12/2025`, etc.)
   - Click "Save"

5. **Deploy**:
   - Vercel will automatically trigger a new deployment from the selected branch
   - Or go to the "Deployments" tab and click "Redeploy" → "Use Existing Build" or trigger a new build

## Method 2: Via Vercel CLI

### Deploy a Specific Branch (Preview)

1. **Checkout the branch locally**:
   ```bash
   git checkout <branch-name>
   # Example: git checkout 1/12/2025
   ```

2. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

3. **Deploy from current branch**:
   ```bash
   vercel
   ```
   This creates a preview deployment from the current branch.

### Set Production Branch via CLI

1. **Link to your project** (if not already linked):
   ```bash
   cd backend
   vercel link
   ```

2. **Deploy specific branch to production**:
   ```bash
   vercel --prod --branch <branch-name>
   # Example: vercel --prod --branch 1/12/2025
   ```

## Method 3: Create Branch-Specific Deployments

You can also create separate Vercel projects for different branches:

1. **Go to Vercel Dashboard** → **Add New Project**

2. **Select the same repository**

3. **Configure**:
   - Set **Root Directory** to `backend`
   - Set **Production Branch** to your desired branch (e.g., `1/12/2025`)
   - Configure build settings as before

4. **This creates a separate project** that always deploys from that branch

## Quick Commands Reference

```bash
# Deploy current branch as preview
vercel

# Deploy specific branch as preview
vercel --branch <branch-name>

# Deploy current branch to production
vercel --prod

# Deploy specific branch to production
vercel --prod --branch <branch-name>

# List all deployments
vercel ls

# View project settings
vercel inspect
```

## Important Notes

- **Production Branch**: The branch that gets deployed to your production domain
- **Preview Deployments**: Every branch gets its own preview URL automatically
- **Automatic Deployments**: Vercel automatically deploys when you push to any branch (if enabled in settings)
- **Environment Variables**: Make sure to set environment variables for the branch you're deploying

## Troubleshooting

### Branch Not Showing in Dashboard
- Make sure the branch exists and has been pushed to GitHub:
  ```bash
  git push origin <branch-name>
  ```

### Deployment Still Using Main Branch
- Clear Vercel cache and redeploy
- Check Git settings in Vercel dashboard
- Ensure you've saved the production branch change

### Want to Deploy Multiple Branches Simultaneously
- Each branch automatically gets a preview deployment
- Use different Vercel projects for different production branches
- Or use Vercel's branch-specific environment variables


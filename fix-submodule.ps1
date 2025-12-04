# Script to fix the next-app submodule issue for Netlify deployment
# Run this from the repository root

Write-Host "Removing submodule reference for next-app..." -ForegroundColor Yellow

# Remove the submodule entry from Git index
git rm --cached next-app 2>$null

# Remove submodule entry from .gitmodules if it exists
if (Test-Path .gitmodules) {
    git config -f .gitmodules --remove-section submodule.next-app 2>$null
    Remove-Item .gitmodules -ErrorAction SilentlyContinue
}

# Remove the submodule directory from .git/modules
Remove-Item -Recurse -Force .git/modules/next-app -ErrorAction SilentlyContinue

# Remove submodule entry from .git/config
git config --remove-section submodule.next-app 2>$null

Write-Host "Adding next-app as regular files..." -ForegroundColor Yellow

# Add next-app directory as regular files
git add next-app/

# Add all other new files
git add .gitignore
git add DEPLOYMENT.md
git add QUICK_DEPLOY.md
git add backend/.gitignore
git add backend/DEPLOYMENT_CHECKLIST.md
git add backend/render.yaml
git add backend/package.json
git add next-app/netlify.toml
git add next-app/.gitignore

Write-Host "`nFiles staged. Review with 'git status' and commit with:" -ForegroundColor Green
Write-Host "  git commit -m 'Fix: Remove next-app submodule reference and add as regular files'" -ForegroundColor Cyan
Write-Host "  git push origin 1/12/2025" -ForegroundColor Cyan








# Git History Cleanup Script - Remove All Secrets
# WARNING: This rewrites git history! Backup first!

Write-Host "=== Git History Secret Removal ===" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check if git-filter-repo is installed
Write-Host "Checking for git-filter-repo..." -ForegroundColor Cyan
$filterRepoExists = Get-Command git-filter-repo -ErrorAction SilentlyContinue

if (-not $filterRepoExists) {
    Write-Host "Installing git-filter-repo via pip..." -ForegroundColor Yellow
    pip install git-filter-repo
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install git-filter-repo" -ForegroundColor Red
        Write-Host "Please install manually: pip install git-filter-repo" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Create backup
Write-Host ""
Write-Host "Creating backup..." -ForegroundColor Cyan
$backupDir = "..\health-pulse-fix-main-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path . -Destination $backupDir -Recurse -Force
Write-Host "Backup created at: $backupDir" -ForegroundColor Green

# Step 3: Confirm with user
Write-Host ""
Write-Host "WARNING: This will rewrite ALL git history!" -ForegroundColor Red
Write-Host "Secrets to remove:" -ForegroundColor Yellow
Get-Content secrets-to-redact.txt | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted by user." -ForegroundColor Yellow
    exit 0
}

# Step 4: Remove secrets using git-filter-repo
Write-Host ""
Write-Host "Removing secrets from history..." -ForegroundColor Cyan

# Create replacement expressions file
$replacements = @"
AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI==>REDACTED_FIREBASE_API_KEY
kiosk-e6b59.firebaseapp.com==>REDACTED_AUTH_DOMAIN
kiosk-e6b59.firebasestorage.app==>REDACTED_STORAGE_BUCKET
1:405281288207:web:0ed997bf9b7e5252dab37a==>REDACTED_APP_ID
405281288207==>REDACTED_SENDER_ID
kiosk-e6b59==>REDACTED_PROJECT_ID
"@

$replacements | Out-File -FilePath "replace-expressions.txt" -Encoding UTF8

# Run git-filter-repo
Write-Host "Running git-filter-repo..." -ForegroundColor Cyan
git filter-repo --replace-text replace-expressions.txt --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Secrets removed from history!" -ForegroundColor Green
} else {
    Write-Host "ERROR: git-filter-repo failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Clean up
Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Cyan
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 6: Re-add remote (git-filter-repo removes it)
Write-Host ""
Write-Host "Re-adding remote..." -ForegroundColor Cyan
git remote add origin https://github.com/sanjaythakor79844/Con_mur_app.git

# Step 7: Show summary
Write-Host ""
Write-Host "=== CLEANUP COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review changes: git log --oneline -10" -ForegroundColor White
Write-Host "2. Verify secrets removed: git log --all -p | Select-String 'AIzaSy'" -ForegroundColor White
Write-Host "3. Force push to GitHub: git push origin --force --all" -ForegroundColor White
Write-Host "4. Force push tags: git push origin --force --tags" -ForegroundColor White
Write-Host ""
Write-Host "WARNING: Team members must re-clone the repo!" -ForegroundColor Red
Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan

# Clean up temp files
Remove-Item secrets-to-redact.txt -ErrorAction SilentlyContinue
Remove-Item replace-expressions.txt -ErrorAction SilentlyContinue

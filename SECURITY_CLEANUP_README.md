# Git History Secret Removal - Instructions

## ⚠️ CRITICAL WARNING

This process **rewrites all git history** and is **irreversible**. 

**Before proceeding:**
1. ✅ Inform all team members
2. ✅ Create backup (script does this automatically)
3. ✅ Ensure no one is working on the repo
4. ✅ Have Firebase credentials saved separately

---

## Option 1: Automated PowerShell Script (Recommended)

### Step 1: Run the Script

```powershell
# From project root
.\git-history-cleanup.ps1
```

The script will:
- ✅ Install git-filter-repo if needed
- ✅ Create automatic backup
- ✅ Ask for confirmation
- ✅ Remove all secrets from history
- ✅ Clean up references
- ✅ Show next steps

### Step 2: Force Push to GitHub

```powershell
# Verify secrets are gone
git log --all -p | Select-String "AIzaSy"  # Should return nothing

# Force push to remote
git push origin --force --all
git push origin --force --tags
```

### Step 3: Team Members Must Re-Clone

```bash
# Delete old repo
rm -rf health-pulse-fix-main

# Clone fresh copy
git clone https://github.com/sanjaythakor79844/Con_mur_app.git
```

---

## Option 2: Manual BFG Method (Alternative)

### Step 1: Install BFG Repo Cleaner

Download from: https://rtyley.github.io/bfg-repo-cleaner/

```powershell
# Or use Chocolatey
choco install bfg-repo-cleaner
```

### Step 2: Create Secrets File

```powershell
# Create secrets.txt with exposed values
@"
AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI
kiosk-e6b59.firebaseapp.com
kiosk-e6b59.firebasestorage.app
1:405281288207:web:0ed997bf9b7e5252dab37a
"@ | Out-File secrets.txt
```

### Step 3: Run BFG

```powershell
# Clone a mirror
git clone --mirror https://github.com/sanjaythakor79844/Con_mur_app.git

# Clean the mirror
cd Con_mur_app.git
bfg --replace-text ../secrets.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push cleaned history
git push --force
```

---

## Option 3: Manual git-filter-repo (Advanced)

```powershell
# Install git-filter-repo
pip install git-filter-repo

# Create replacement file
@"
AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI==>REDACTED_API_KEY
kiosk-e6b59.firebaseapp.com==>REDACTED_DOMAIN
kiosk-e6b59.firebasestorage.app==>REDACTED_STORAGE
1:405281288207:web:0ed997bf9b7e5252dab37a==>REDACTED_APP_ID
"@ | Out-File replace.txt

# Run filter
git filter-repo --replace-text replace.txt --force

# Re-add remote (filter-repo removes it)
git remote add origin https://github.com/sanjaythakor79844/Con_mur_app.git

# Force push
git push origin --force --all
git push origin --force --tags
```

---

## Verification Checklist

After cleanup, verify:

```powershell
# 1. Check no secrets in history
git log --all -p | Select-String "AIzaSy"  # Should be empty
git log --all -p | Select-String "kiosk-e6b59"  # Should be empty

# 2. Check current .env is safe
git status .env  # Should show "nothing to commit"

# 3. Check .gitignore has .env
Get-Content .gitignore | Select-String "\.env"  # Should match

# 4. Verify working tree
git status  # Should be clean
```

---

## Post-Cleanup Actions

### 1. Rotate Firebase Credentials (Recommended)

Even after removing from history, rotate credentials:

1. Firebase Console → Project Settings
2. Delete old web app
3. Create new web app
4. Update `.env` with new credentials
5. Update Render.com environment variables

### 2. Update Team

Send email to team:

```
Subject: URGENT - Git History Rewritten

Team,

We've cleaned sensitive data from git history. 

ACTION REQUIRED:
1. Delete your local repo copy
2. Re-clone from GitHub
3. Update your .env file with new credentials (ask lead)

DO NOT:
- Try to pull/merge old branches
- Push from old local copies

If you have questions, reach out immediately.
```

---

## Troubleshooting

### Error: "git-filter-repo not found"

```powershell
pip install git-filter-repo
# Or
pip3 install git-filter-repo
```

### Error: "refusing to run without --force"

Git-filter-repo needs --force for safety. The script includes this.

### Error: "remote origin already exists"

```powershell
git remote remove origin
git remote add origin https://github.com/sanjaythakor79844/Con_mur_app.git
```

### Team member gets "non-fast-forward" error

They need to re-clone:

```bash
rm -rf old-repo
git clone https://github.com/sanjaythakor79844/Con_mur_app.git
```

---

## Backup Location

Script creates backup at: `../health-pulse-fix-main-backup-YYYYMMDD-HHMMSS/`

Keep this backup for at least 30 days.

---

## Security Best Practices Going Forward

1. ✅ Never commit `.env` file
2. ✅ Use `.env.example` for templates only
3. ✅ Add pre-commit hooks to block secrets
4. ✅ Use environment variables in CI/CD
5. ✅ Rotate credentials regularly
6. ✅ Enable Firebase App Check
7. ✅ Restrict Firebase API keys to specific domains

---

## Support

If you encounter issues:
1. Check backup folder
2. Review error messages carefully
3. Ask for help before force pushing
4. Keep backup until confirmed working

---

**Generated:** 2026-09-14  
**Purpose:** Remove accidentally committed Firebase credentials from git history

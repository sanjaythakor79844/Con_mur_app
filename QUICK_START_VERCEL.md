# Vercel Deployment - Quick Start Guide

## 🚀 2-Minute Setup

### Option 1: Automatic (Using PowerShell Script)

```powershell
# Run this script (will import all environment variables)
.\vercel-import-env.ps1
```

**That's it!** Script will:
1. ✓ Check Vercel CLI
2. ✓ Login to Vercel
3. ✓ Link your project
4. ✓ Import all 9 environment variables

---

### Option 2: Manual (Vercel Dashboard)

**1. Go to Vercel Dashboard:**
```
https://vercel.com/dashboard
```

**2. Import Project:**
- Click **"Import Project"**
- Connect GitHub repository
- Select: `health-pulse-fix-main`

**3. Add Environment Variables:**
- Go to: **Settings → Environment Variables**
- Click **"Bulk Add"**
- Copy-paste from `.env.vercel` file:

```env
VITE_API_BASE_URL=https://aaha-api-405281288207.asia-south1.run.app/api/v2
VITE_BLOOD_REPORT_API_BASE_URL=https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2
VITE_FEATURE_API_BASE_URL=https://aaha-feature-backend.onrender.com/api/v2
VITE_FIREBASE_API_KEY=AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI
VITE_FIREBASE_AUTH_DOMAIN=kiosk-e6b59.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kiosk-e6b59
VITE_FIREBASE_STORAGE_BUCKET=kiosk-e6b59.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=405281288207
VITE_FIREBASE_APP_ID=1:405281288207:web:0ed997bf9b7e5252dab37a
```

**4. Select Environments:**
- ✅ Production
- ✅ Preview  
- ✅ Development

**5. Deploy:**
- Click **"Deploy"**
- Wait 3-5 minutes
- ✓ Done!

---

## 📝 Build Settings (Auto-Detected)

Vercel will automatically detect:
```
Framework: Vite
Build Command: npm run build
Output Directory: .output/public
Node Version: 18.x
```

**No configuration file needed!**

---

## ✅ Post-Deployment Checklist

### Immediately After Deployment:

**1. Get Vercel URL:**
```
https://your-app-name.vercel.app
```

**2. Test Basic Load:**
- ✓ App loads
- ✓ No console errors

### Within 24 Hours:

**3. Update Firebase Console:**
```
Firebase Console → Authentication → Settings → Authorized Domains
Add: your-app-name.vercel.app
```

**4. Update GCS CORS:**
```bash
# Edit cors-config.json, add Vercel domain
# Then run:
gsutil cors set cors-config.json gs://aaha-reports
```

**5. Update Backend CORS:**
Contact backend teams to add Vercel origin to CORS whitelist.

---

## 🔧 Troubleshooting

### Issue: Build Fails
```bash
# Check build locally first
npm run build

# If local build works but Vercel fails:
# 1. Check Node version (should be 18.x)
# 2. Clear Vercel cache and redeploy
```

### Issue: Environment Variables Not Working
```bash
# Verify in Vercel Dashboard:
Settings → Environment Variables → Should see all 9 vars

# After adding/changing variables:
# Must redeploy (click "Redeploy" in Deployments tab)
```

### Issue: API Calls Failing
```
# Check browser console for CORS errors
# If CORS error: Contact backend team to add Vercel origin
```

### Issue: Firebase Auth Failing
```
# Google OAuth: Update Firebase authorized domains
# Phone OTP: Should work immediately (no config needed)
```

---

## 📊 Architecture

```
┌─────────────────────────────────┐
│   FRONTEND (Vercel - NEW)       │
│   https://your-app.vercel.app   │
└─────────────────────────────────┘
              ↓
              ↓ API Calls
              ↓
┌─────────────────────────────────┐
│   BACKENDS (No Change)          │
│   • Common API (GCP)            │
│   • Blood Report API (GCP)      │
│   • Feature Backend (Render)    │
│   • Firebase Auth               │
│   • GCS Storage                 │
└─────────────────────────────────┘
```

**Same backends, new frontend hosting!**

---

## 📚 Files Created

- ✅ `.env.vercel` - Environment variables (ready to import)
- ✅ `VERCEL_ENV_IMPORT.md` - Detailed import guide
- ✅ `vercel-import-env.ps1` - PowerShell import script
- ✅ `QUICK_START_VERCEL.md` - This file

**All files are gitignored (safe from accidental commit)**

---

## 🎯 Quick Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Deploy to production
vercel --prod

# Pull environment variables (verify)
vercel env pull

# Check deployment status
vercel ls

# View logs
vercel logs
```

---

## 🔐 Security Notes

✅ **Environment variables encrypted** in Vercel  
✅ **`.env.vercel` is gitignored** (safe locally)  
✅ **Same Firebase config** as production (already secure)  
✅ **Backend APIs unchanged** (existing security maintained)

---

## 📞 Support

**If deployment fails:**
1. Check build logs in Vercel dashboard
2. Test local build: `npm run build`
3. Review detailed guide: `VERCEL_ENV_IMPORT.md`
4. Check audit report for CORS/Firebase updates needed

**Backend teams to contact:**
- Common API CORS update
- Blood Report API CORS update
- Feature Backend CORS update
- GCS bucket CORS update

---

**Ready to deploy! Choose Option 1 (script) or Option 2 (manual).** 🚀

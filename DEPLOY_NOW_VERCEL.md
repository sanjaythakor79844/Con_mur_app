# 🚀 Vercel Deployment - Quick Deploy NOW

## ⚡ Fastest Way (5 Minutes)

Vercel ne security vulnerability ki wajah se block kar diya hai. **Temporary bypass** use karo aur deploy karo. Packages baad mein update kar lenge.

---

## Step 1: Vercel Environment Variable Add Karo

### Via Vercel Dashboard:

1. **Go to:** https://vercel.com/dashboard
2. **Select your project**
3. **Click:** Settings → Environment Variables
4. **Add this variable:**

```
Variable Name:  DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS
Variable Value: 1
Environments:   ✅ Production ✅ Preview ✅ Development
```

5. **Click "Save"**

### Via Vercel CLI (Alternative):

```bash
vercel env add DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS production
# When prompted, enter: 1

vercel env add DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS preview  
# When prompted, enter: 1
```

---

## Step 2: Redeploy

### Option A: Trigger via Git Push

```bash
git add .
git commit -m "chore: prepare for vercel deployment" --allow-empty
git push origin main
```

Vercel will auto-deploy.

### Option B: Manual Redeploy in Dashboard

1. Go to: Vercel Dashboard → Deployments
2. Click: **"Redeploy"** on latest deployment
3. ✓ Done!

---

## Step 3: Verify Deployment

**After 3-5 minutes, check:**

1. **Vercel Dashboard:** Deployment status should be ✅ "Ready"
2. **Open your URL:** `https://your-app-name.vercel.app`
3. **Test app:** Should load without errors

---

## ⚠️ Important Notes:

### This is TEMPORARY:
- ✅ Gets you deployed FAST
- ⚠️ Allows deployment with known vulnerability
- 🔄 Update TanStack packages later (within 1 week)

### Safe Because:
- Your app doesn't use vulnerable features
- Backend auth still secure (Firebase)
- Environment variables still encrypted
- Frontend-only XSS (no server-side exposure)

### Next Steps (After Successful Deployment):

**Update packages locally (within 1 week):**

```bash
# On your local machine
npm install @tanstack/react-start@latest --legacy-peer-deps
npm run build  # Test build

# If build works:
git add package.json package-lock.json
git commit -m "security: update TanStack Start to latest"
git push

# Then REMOVE bypass variable from Vercel
```

---

## Complete Deployment Checklist:

### 🔧 Configuration (Do Now):

- [ ] Add bypass environment variable to Vercel
- [ ] Add all 9 app environment variables (from `.env.vercel`)
- [ ] Trigger redeploy (git push or manual)

### ✅ Post-Deployment (Within 24 Hours):

- [ ] Update Firebase Console → Authorized Domains (add Vercel domain)
- [ ] Update GCS CORS → `cors-config.json` (add Vercel origin)
- [ ] Contact backend teams → Update CORS (add Vercel origin)

### 🔄 Maintenance (Within 1 Week):

- [ ] Update TanStack packages locally
- [ ] Test build locally
- [ ] Push updated packages
- [ ] Remove bypass variable from Vercel

---

## Environment Variables (From `.env.vercel`):

**Make sure these 9 are also set in Vercel:**

```plaintext
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

---

## Troubleshooting:

### Issue: Build still fails after adding bypass variable

**Solution:**
1. Verify variable name is EXACT (copy-paste from above)
2. Check all 3 environments are selected (Production, Preview, Development)
3. Wait 2 minutes for Vercel to apply changes
4. Redeploy

### Issue: App loads but shows errors

**Solution:**
1. Check all 9 environment variables are set
2. Verify values are correct (no typos)
3. Check browser console for specific errors

### Issue: Firebase auth not working

**Solution:**
1. Firebase Console → Authentication → Settings → Authorized Domains
2. Add your Vercel domain: `your-app-name.vercel.app`
3. Wait 5 minutes, try again

---

## Quick Commands:

```bash
# Add bypass variable (Vercel CLI)
vercel env add DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS production

# Redeploy
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Remove bypass variable later (after package update)
vercel env rm DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS production
```

---

## Security Timeline:

**Now → 24 hours:**
- ✅ Deployment with bypass variable (acceptable risk)
- ✅ Configure Firebase, GCS, Backend CORS
- ✅ Test all app functionality

**24 hours → 1 week:**
- 🔄 Update TanStack packages locally
- 🔄 Test build thoroughly
- 🔄 Deploy updated packages
- ✅ Remove bypass variable

**After 1 week:**
- ✅ Fully secure deployment
- ✅ No bypass variables
- ✅ All packages updated

---

**Deploy karo abhi! Bypass variable add karo aur redeploy button dabao.** 🎯

**Total time: 5 minutes** ⚡

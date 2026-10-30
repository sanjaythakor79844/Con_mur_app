# Vercel Environment Variables Import Guide

## Method 1: Vercel CLI (Fastest - Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Link Project
```bash
cd f:\health-pulse-fix-main\health-pulse-fix-main
vercel link
```

### Step 4: Import Environment Variables
```bash
# Import from .env.vercel file
vercel env add VITE_API_BASE_URL production < .env.vercel
vercel env add VITE_BLOOD_REPORT_API_BASE_URL production < .env.vercel
vercel env add VITE_FEATURE_API_BASE_URL production < .env.vercel
vercel env add VITE_FIREBASE_API_KEY production < .env.vercel
vercel env add VITE_FIREBASE_AUTH_DOMAIN production < .env.vercel
vercel env add VITE_FIREBASE_PROJECT_ID production < .env.vercel
vercel env add VITE_FIREBASE_STORAGE_BUCKET production < .env.vercel
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production < .env.vercel
vercel env add VITE_FIREBASE_APP_ID production < .env.vercel
```

**Or use this script:**

```bash
# Set all environment variables at once
vercel env add VITE_API_BASE_URL production
# Paste: https://aaha-api-405281288207.asia-south1.run.app/api/v2

vercel env add VITE_BLOOD_REPORT_API_BASE_URL production
# Paste: https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2

vercel env add VITE_FEATURE_API_BASE_URL production
# Paste: https://aaha-feature-backend.onrender.com/api/v2

vercel env add VITE_FIREBASE_API_KEY production
# Paste: AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI

vercel env add VITE_FIREBASE_AUTH_DOMAIN production
# Paste: kiosk-e6b59.firebaseapp.com

vercel env add VITE_FIREBASE_PROJECT_ID production
# Paste: kiosk-e6b59

vercel env add VITE_FIREBASE_STORAGE_BUCKET production
# Paste: kiosk-e6b59.firebasestorage.app

vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
# Paste: 405281288207

vercel env add VITE_FIREBASE_APP_ID production
# Paste: 1:405281288207:web:0ed997bf9b7e5252dab37a
```

---

## Method 2: Vercel Dashboard (Manual)

### Step 1: Go to Vercel Dashboard
Open: https://vercel.com/dashboard

### Step 2: Select Your Project
Click on your deployed project

### Step 3: Go to Settings
Click **Settings** → **Environment Variables**

### Step 4: Add Each Variable

**Variable 1:**
```
Name: VITE_API_BASE_URL
Value: https://aaha-api-405281288207.asia-south1.run.app/api/v2
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 2:**
```
Name: VITE_BLOOD_REPORT_API_BASE_URL
Value: https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 3:**
```
Name: VITE_FEATURE_API_BASE_URL
Value: https://aaha-feature-backend.onrender.com/api/v2
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 4:**
```
Name: VITE_FIREBASE_API_KEY
Value: AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 5:**
```
Name: VITE_FIREBASE_AUTH_DOMAIN
Value: kiosk-e6b59.firebaseapp.com
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 6:**
```
Name: VITE_FIREBASE_PROJECT_ID
Value: kiosk-e6b59
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 7:**
```
Name: VITE_FIREBASE_STORAGE_BUCKET
Value: kiosk-e6b59.firebasestorage.app
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 8:**
```
Name: VITE_FIREBASE_MESSAGING_SENDER_ID
Value: 405281288207
Environments: ✅ Production ✅ Preview ✅ Development
```

**Variable 9:**
```
Name: VITE_FIREBASE_APP_ID
Value: 1:405281288207:web:0ed997bf9b7e5252dab37a
Environments: ✅ Production ✅ Preview ✅ Development
```

### Step 5: Save & Redeploy
Click **"Save"** and then **"Redeploy"** your project

---

## Method 3: Bulk Import via Vercel UI

### Step 1: Go to Environment Variables
Vercel Dashboard → Project → Settings → Environment Variables

### Step 2: Click "Add New" → "Bulk Add"

### Step 3: Paste This (Plain Text Format)
```
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

### Step 4: Select Environments
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 5: Click "Add" and Redeploy

---

## Verification

After adding variables, verify in Vercel:

```bash
# Pull environment variables to local
vercel env pull

# Check if all variables are set
cat .env.local
```

Or check in Vercel Dashboard:
1. Settings → Environment Variables
2. Should see all 9 variables listed
3. Each should have Production/Preview/Development tags

---

## Important Notes

⚠️ **After adding environment variables:**
- Vercel requires a **redeploy** for changes to take effect
- Click **"Redeploy"** in Deployments tab
- Or push a new commit to trigger redeployment

✅ **Security:**
- `.env.vercel` is included in `.gitignore` (safe to create locally)
- Never commit this file to Git
- Vercel encrypts all environment variables

🔄 **Same as Render:**
- These are the EXACT same values from your Render deployment
- Backend URLs unchanged
- Firebase config unchanged
- Only frontend hosting changes (Render → Vercel)

---

## Troubleshooting

### Issue: Variables not showing in build
**Solution:** Redeploy after adding variables

### Issue: "Environment variable not found"
**Solution:** Check variable name spelling (must be exact)

### Issue: App not connecting to backend
**Solution:** Verify URLs are correct (no trailing slashes)

### Issue: Firebase auth failing
**Solution:** 
1. Check all 6 Firebase variables are present
2. Add Vercel domain to Firebase Console → Authorized Domains

---

## Quick Copy-Paste (For Bulk Import)

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

**Total Variables:** 9  
**Environments:** Production, Preview, Development (all 3)  
**Action Required:** Add to Vercel → Redeploy

---

**Ready for import!** 🚀

# 🔥 Firebase Phone Authentication Setup - REQUIRED

## ❌ Current Error

```
FirebaseError: Firebase: Error (auth/invalid-app-credential)
```

**This error means Phone Authentication is NOT enabled in Firebase Console.**

---

## ✅ Step-by-Step Firebase Setup (5 minutes)

### Step 1: Open Firebase Console

1. Go to: https://console.firebase.google.com/
2. Login with your Google account
3. Select project: **kiosk-e6b59**

### Step 2: Enable Phone Authentication

1. In left sidebar, click **"Build"** → **"Authentication"**
2. Click **"Get Started"** (if first time)
3. Click on **"Sign-in method"** tab
4. Find **"Phone"** in the list of providers
5. Click on **"Phone"**
6. Toggle **"Enable"** switch to ON
7. Click **"Save"**

### Step 3: Add Authorized Domains

1. Still in Authentication → **"Settings"** tab
2. Scroll to **"Authorized domains"** section
3. Make sure these domains are listed:
   - ✅ `localhost` (should be there by default)
   - ✅ `kiosk-e6b59.firebaseapp.com`
   - ✅ `kiosk-e6b59.web.app`
4. If deploying to custom domain, add that too
5. Click **"Add domain"** if needed

### Step 4: Configure reCAPTCHA (Important!)

Firebase Phone Auth requires reCAPTCHA verification.

#### Option A: Enable reCAPTCHA Enterprise (Recommended for Production)

1. Go to: https://console.cloud.google.com/
2. Select project: **kiosk-e6b59**
3. Search for **"reCAPTCHA Enterprise"** in search bar
4. Click **"Enable API"**
5. Wait for activation (1-2 minutes)

#### Option B: Use Test Phone Numbers (Development Only)

For testing without real SMS:

1. Firebase Console → Authentication → Sign-in method → Phone
2. Scroll down to **"Phone numbers for testing"**
3. Click **"Add phone number"**
4. Add test numbers with codes:
   - Phone: `+919876543210`
   - Code: `123456`
   - Click **"Add"**
5. Now you can use this number for testing

---

## 🧪 Test the Setup

### After Firebase Setup is Complete:

1. **Refresh your app** (hard refresh: Ctrl+Shift+R)
2. Go to http://localhost:8080/login
3. Enter phone number: `9876543210`
4. Click **"Send OTP"**
5. You should see **reCAPTCHA challenge** appear
6. Complete the reCAPTCHA
7. OTP should be sent! ✅

### Using Test Phone Number:

If you added test number `+919876543210` with code `123456`:

1. Enter: `9876543210`
2. Click "Send OTP"
3. Enter OTP: `123456`
4. Should work instantly!

---

## 🔧 Additional Configuration

### Enable App Check (Optional, for Production)

App Check protects your backend from abuse:

1. Firebase Console → Build → App Check
2. Click **"Get Started"**
3. Select **"Web"**
4. Choose **"reCAPTCHA v3"** or **"reCAPTCHA Enterprise"**
5. Register your app
6. Copy the App Check token
7. Add to your .env:
   ```env
   VITE_FIREBASE_APP_CHECK_KEY=your_app_check_key
   ```

### SMS Quota and Billing

**Free Tier Limits:**
- 10 SMS verifications per day
- 50 SMS per month

**For Production:**
1. Firebase Console → Settings → Usage and billing
2. Upgrade to **"Blaze Plan"** (Pay as you go)
3. SMS costs vary by country:
   - India: ~$0.01 per SMS
   - USA: ~$0.05 per SMS

---

## 🐛 Troubleshooting

### Error: "auth/invalid-app-credential"
**Cause:** Phone authentication not enabled  
**Fix:** Follow Step 2 above ✅

### Error: "auth/captcha-check-failed"
**Cause:** reCAPTCHA verification failed  
**Fix:** 
- Check authorized domains
- Try visible reCAPTCHA (size: 'normal')
- Enable reCAPTCHA Enterprise

### Error: "auth/too-many-requests"
**Cause:** Rate limit exceeded  
**Fix:** 
- Wait 10-15 minutes
- Use test phone numbers
- Upgrade to Blaze plan

### Error: "auth/invalid-phone-number"
**Cause:** Wrong phone format  
**Fix:** Use +91 prefix for India (e.g., +919876543210)

### reCAPTCHA not appearing
**Fix:**
1. Check browser console for errors
2. Disable ad blockers
3. Try incognito mode
4. Clear browser cache

### Error: "This domain is not authorized"
**Cause:** localhost not in authorized domains  
**Fix:** Add localhost to authorized domains (Step 3)

---

## 📋 Checklist

Before testing the app, make sure:

- [ ] Firebase project exists: `kiosk-e6b59`
- [ ] Phone authentication is ENABLED
- [ ] `localhost` is in authorized domains
- [ ] reCAPTCHA Enterprise is enabled (or test numbers added)
- [ ] Environment variables are correct in `.env`
- [ ] App is running on http://localhost:8080
- [ ] Browser allows popups and cookies

---

## 🚀 Quick Setup Commands

```bash
# 1. Make sure .env is correct
cat .env

# 2. Restart dev server
npm run dev

# 3. Open in browser
# http://localhost:8080/login

# 4. Test with phone number
# Enter: 9876543210
# Complete reCAPTCHA
# Enter received OTP
```

---

## 📞 Support

If still facing issues:

1. **Check Firebase Console:**
   - Authentication → Users (check if users are being created)
   - Authentication → Usage (check quota)

2. **Check Browser Console:**
   - Look for detailed error messages
   - Check Network tab for failed requests

3. **Verify API Key:**
   ```bash
   # In browser console:
   console.log(import.meta.env.VITE_FIREBASE_API_KEY)
   # Should show: AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI
   ```

4. **Test Firebase Connection:**
   ```javascript
   // In browser console:
   import { auth } from './src/lib/firebase';
   console.log(auth.app.name); // Should show: [DEFAULT]
   ```

---

## ✅ Success Indicators

When everything is working:

1. ✅ No console errors
2. ✅ reCAPTCHA appears on "Send OTP"
3. ✅ SMS received (or test code works)
4. ✅ OTP verification succeeds
5. ✅ User redirected to /welcome
6. ✅ Firebase Console shows new user

---

## 🎯 Summary

**The app code is ready!** You just need to:

1. ✅ Enable Phone Auth in Firebase Console (2 minutes)
2. ✅ Add authorized domains (1 minute)
3. ✅ Enable reCAPTCHA or add test numbers (2 minutes)
4. ✅ Test the login flow

**Total setup time: ~5 minutes**

Once Firebase is configured, the authentication will work perfectly with the Kiosk app! 🚀

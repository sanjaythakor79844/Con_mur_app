# 🎭 Demo Mode - Testing Guide

## 📌 Overview

Demo mode allows testing the app **without Firebase OTP** or real phone numbers. Perfect for development and testing!

---

## 🎯 Demo Credentials

### Demo Phone Numbers:
```
9999999999
8888888888  
7777777777
```

### Demo OTP:
```
123456
```

---

## 🧪 How to Test

### Step 1: Open Login Page
```
http://localhost:8080/login
```

### Step 2: Enter Demo Phone
```
Mobile Number: 9999999999
```

### Step 3: Click "Send OTP"
```
✅ You'll see: "Demo Mode Activated! Use OTP: 123456"
✅ No Firebase reCAPTCHA needed!
✅ No real SMS sent!
```

### Step 4: Enter Demo OTP
```
OTP: 123456
```

### Step 5: Login Success! 🎉
```
✅ Redirects to /welcome
✅ Profile created in backend
✅ Ready to test features!
```

---

## 📱 Demo User Profile

**When you use demo phone, this profile is created:**

```javascript
{
  uid: "demo_9999999999_1234567890",
  phoneNumber: "+919999999999",
  firstName: "Demo",
  lastName: "User",
  age: 25,
  gender: "male",
  createdAt: "2024-01-15T10:30:00"
}
```

**In Backend (DB_AHHA):**
```sql
INSERT INTO patients (
  mobile_number,
  firebase_uid,
  full_name,
  age,
  gender
) VALUES (
  '+919999999999',
  'demo_9999999999_1234567890',
  'Demo User',
  25,
  'male'
);
```

---

## 🔄 Testing Complete Flow

### Test 1: Demo Login → View Profile
```
1. Login with: 9999999999
2. OTP: 123456
3. Go to: /profile
4. Should see: "Demo User, Age: 25"
```

### Test 2: Demo Login → Upload Report
```
1. Login with: 8888888888
2. OTP: 123456
3. Go to: /upload-report
4. Fill form:
   - AWIS Score: 75.5
   - Risk Level: Moderate
   - BP: 130/85
5. Submit
6. Should save to backend! ✅
```

### Test 3: Demo Login → View Reports
```
1. Login with: 7777777777
2. OTP: 123456
3. Go to: /reports
4. Should show empty state initially
5. Upload a report
6. Should show in list! ✅
```

### Test 4: Demo Signup (with profile)
```
1. Click "Create account" tab
2. Enter phone: 9999999999
3. Enter details:
   - First Name: Test
   - Last Name: Patient
   - Age: 30
   - Gender: Female
4. Click "Send OTP"
5. Demo mode: OTP is 123456
6. Enter OTP: 123456
7. Profile created! ✅
```

---

## 🎨 UI Features

### Demo Mode Indicator
```
┌─────────────────────────────────────────┐
│ ℹ️ 🎭 Demo Mode Available               │
├─────────────────────────────────────────┤
│ Use demo numbers: 9999999999,           │
│ 8888888888, or 7777777777               │
│                                         │
│ Demo OTP: 123456                        │
└─────────────────────────────────────────┘
```

Shows below phone input field on login page!

---

## 🔧 Technical Details

### How Demo Mode Works:

**File:** `src/routes/login.tsx`

```typescript
// 1. Check if phone is demo number
const DEMO_PHONES = ['9999999999', '8888888888', '7777777777'];
const isDemo = DEMO_PHONES.includes(phoneNumber.trim());

// 2. If demo, skip Firebase
if (isDemo) {
  console.log('🎭 DEMO MODE: Using test phone number');
  toast.success("Demo Mode Activated!", { 
    description: "Use OTP: 123456 to login" 
  });
  setOtpSent(true);
  return; // No Firebase call!
}

// 3. Verify demo OTP
if (isDemo && otp !== '123456') {
  toast.error("Invalid OTP", {
    description: "Demo OTP is 123456"
  });
  return;
}

// 4. Create mock Firebase user
const mockFirebaseUID = `demo_${phoneNumber}_${Date.now()}`;
apiService.setToken(`demo_token_${mockFirebaseUID}`);

// 5. Create patient in backend
await apiService.createPatient({
  mobile_number: "+91" + phoneNumber,
  full_name: "Demo User",
  age: 25,
  gender: "male"
});
```

---

## ✅ Testing Checklist

### Demo Login Flow:
- [ ] Enter demo phone: 9999999999
- [ ] See "Demo Mode Activated!" message
- [ ] No reCAPTCHA appears
- [ ] OTP input field appears
- [ ] Enter OTP: 123456
- [ ] Login successful
- [ ] Redirects to /welcome
- [ ] Profile shows in /profile

### Demo Backend Integration:
- [ ] Patient created in DB_AHHA
- [ ] Can view profile: GET /patients/me
- [ ] Can upload report: POST /reports
- [ ] Can view reports: GET /reports/me
- [ ] Reports show on /reports page

### Demo Multiple Users:
- [ ] Login with 9999999999 → Creates patient_id: 1
- [ ] Logout
- [ ] Login with 8888888888 → Creates patient_id: 2
- [ ] Both patients separate in database ✅

---

## 🚀 Production vs Demo

| Feature | Demo Mode | Production |
|---------|-----------|------------|
| Phone Numbers | 9999999999, 8888888888, 7777777777 | Real numbers |
| OTP | Always 123456 | Real SMS OTP |
| Firebase | Bypassed | Real Firebase |
| reCAPTCHA | Not shown | Required |
| Backend API | ✅ Real DB_AHHA | ✅ Same |
| Patient Creation | ✅ Works | ✅ Works |
| Report Upload | ✅ Works | ✅ Works |

**Important:** Demo mode only works for testing. In production, use real phone numbers!

---

## 🎯 When to Use Demo Mode

### ✅ Use Demo Mode For:
- Development testing
- Backend API testing
- UI/UX testing
- Feature testing
- QA testing
- Demo presentations

### ❌ Don't Use Demo Mode For:
- Production deployment
- Real user accounts
- Live testing with clients
- Security testing

---

## 📝 Demo Mode Scenarios

### Scenario 1: Testing Backend Integration
```
Goal: Verify app connects to Kiosk backend

Steps:
1. Start backend: python app.py
2. Login with: 9999999999
3. OTP: 123456
4. Check console: Should see "Patient created in backend"
5. Check backend logs: Should see API calls
6. Success! ✅
```

### Scenario 2: Testing Report Upload
```
Goal: Verify report upload to DB_AHHA

Steps:
1. Login with: 8888888888
2. Go to: /upload-report
3. Fill form and submit
4. Check console: Should see "Report created"
5. Go to: /reports
6. Should see uploaded report
7. Success! ✅
```

### Scenario 3: Testing Vice Versa
```
Goal: Verify data sharing between apps

Steps:
1. Login on Consumer App: 9999999999
2. Upload report
3. TODO: Open Kiosk with same phone
4. Should see Consumer App report on Kiosk
5. Success! ✅
```

---

## 🔒 Security Note

**Demo mode is for DEVELOPMENT ONLY!**

```javascript
// In production, disable demo mode:
const DEMO_PHONES = import.meta.env.PROD 
  ? [] // No demo phones in production
  : ['9999999999', '8888888888', '7777777777'];
```

Or use environment variable:
```env
VITE_DEMO_MODE=true  # Development
VITE_DEMO_MODE=false # Production
```

---

## 🎉 Summary

✅ **Demo phones:** 9999999999, 8888888888, 7777777777  
✅ **Demo OTP:** 123456  
✅ **No Firebase needed** - Bypasses authentication  
✅ **Backend works** - Real API calls to DB_AHHA  
✅ **Full testing** - All features testable  
✅ **UI indicator** - Shows demo mode info  
✅ **Easy testing** - No SMS or real phones needed  

---

**Happy Testing! 🚀**

Test karo aur backend integration verify karo without real OTP hassle!

# Phone Authentication Setup Guide

## Firebase Console Configuration

To enable phone authentication, you need to configure Firebase:

### 1. Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `kiosk-e6b59`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Phone** and **Enable** it
5. Save changes

### 2. Configure reCAPTCHA (Important!)

Phone authentication requires reCAPTCHA verification:

#### Option A: Add Authorized Domain (Recommended for Development)
1. In Firebase Console → **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Add `localhost` if not already present
4. Add your production domain when deploying

#### Option B: Test Phone Numbers (for Development)
1. In Firebase Console → **Authentication** → **Sign-in method** → **Phone**
2. Scroll to **Phone numbers for testing**
3. Add test numbers with OTP codes, e.g.:
   - Phone: `+919876543210`
   - OTP: `123456`

### 3. Configure reCAPTCHA v3 (Production)

For production, you should use reCAPTCHA v3:

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register your site with reCAPTCHA v3
3. Add the site key to your Firebase project

## Current Implementation

### Features:
- ✅ Phone number authentication with OTP
- ✅ User signup with profile details:
  - First Name
  - Last Name
  - Age
  - Gender (Male/Female/Other)
  - Mobile Number
- ✅ Sign in for existing users
- ✅ Profile data stored in localStorage (for now)
- ✅ Firebase Auth integration

### User Flow:

**Sign Up:**
1. User enters mobile number (+91 prefix)
2. User fills in first name, last name, age, gender
3. User clicks "Send OTP"
4. Firebase sends OTP to mobile number
5. User enters 6-digit OTP
6. User clicks "Verify OTP"
7. Profile is saved and user is redirected to /welcome

**Sign In:**
1. User enters mobile number
2. User clicks "Send OTP"
3. User enters received OTP
4. User clicks "Verify OTP"
5. User is signed in and redirected to /welcome

## Testing Without Firebase Phone Auth

If you haven't enabled Firebase Phone Auth yet, the app will show errors. You have two options:

### Option 1: Enable Firebase Phone Auth (Recommended)
Follow the steps above in Firebase Console.

### Option 2: Use Test Mode
Add test phone numbers in Firebase Console for development.

## Production Considerations

⚠️ **Important:** Currently user profiles are stored in localStorage. For production, you should:

1. **Use Firestore:** Store user profiles in Firestore database
2. **Use Backend API:** Store profiles in your backend database
3. **Add Validation:** Server-side validation of all user inputs
4. **Add Security Rules:** Proper Firestore security rules

### Suggested Firestore Structure:
```
users/{uid}/
  ├─ phoneNumber: string
  ├─ firstName: string
  ├─ lastName: string
  ├─ age: number
  ├─ gender: string
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp
```

## Next Steps

1. Enable Phone Authentication in Firebase Console
2. Test signup and signin flow
3. Implement Firestore for user profile storage
4. Add profile editing functionality
5. Add proper error handling and validation
6. Configure production reCAPTCHA

## Support

For issues:
- Check Firebase Console for authentication errors
- Check browser console for JavaScript errors
- Verify reCAPTCHA is properly initialized
- Ensure phone numbers are in correct format (+91XXXXXXXXXX)

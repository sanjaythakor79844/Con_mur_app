# Health Pulse Consumer App - Troubleshooting Guide

## 🔍 Current Status

### ✅ What's Working:
- Backend API running on `http://localhost:5001`
- Frontend running on `http://localhost:3000`
- CORS properly configured (localhost:3000 allowed)
- OPTIONS preflight requests returning 200
- Demo token authentication working
- Patient profile API working (200 responses)
- Upload table exists in database
- Gender values fixed (Male/Female/Other)

### 🔧 What's Been Fixed:
1. CORS errors - Added localhost:3000 to allowed origins
2. Upload endpoint - Added `/api/v2/reports/upload` route
3. Gender enum errors - Updated database values to match enum
4. Patient linking - Added `/api/v2/patients/link-by-phone` API
5. OPTIONS 401 errors - Added OPTIONS handler in auth decorator

## 📊 Database Status

**Database Location**: `D:\Vinay\aaha-kiosk-main\DB_AHHA\AAHA\database\aaha.db`

**Patients with phone 7777777777**:
1. `PAT-7777777777` - Sanjay Thakor (No Firebase UID)
2. `P4981826100` - Demo User (Firebase UID: demo_7777777777) ✅
3. `P5832142000` - Demo User (Firebase UID: demo_9999999999)

**Tables**:
- patient (14 rows)
- uploads (0 rows) - No uploads yet
- reports (0 rows) - No reports yet
- clinical_visit (67 rows)
- vitals (55 rows)

## 🎯 How to Test

### Demo Login:
1. Go to `http://localhost:3000`
2. Click "Use Demo Mode"
3. Enter phone: `7777777777`
4. Patient should load: **Demo User** (firebase_uid: demo_7777777777)

### Real Phone Login:
1. Go to `http://localhost:3000`
2. Enter your real phone number
3. Get OTP from Firebase
4. If phone number exists in Kiosk database, it will automatically link
5. Toast message: "Account linked! Your kiosk data is now synced"

## 🔗 Patient Linking Logic

When you login with a phone number:
1. Frontend calls `/api/v2/patients/me` to get profile
2. If Firebase UID not found, calls `/api/v2/patients/link-by-phone`
3. Backend searches for patient by phone number
4. Updates Firebase UID in database
5. Returns linked patient profile

## 📝 Current Issues to Debug

### If data not showing:
1. Check browser console for errors (F12)
2. Check Network tab for failed API calls
3. Verify token is being sent in Authorization header
4. Check backend logs for errors

### If Kiosk data not visible in Consumer app:
- Make sure phone number matches exactly
- Check if patient has Firebase UID linked
- Run: `py check_patient.py` to see patient details

### If upload not working:
- Check if token is valid
- Verify file size < 10MB
- Check file type (pdf, jpg, png allowed)
- Check backend logs for upload errors

## 🚀 API Endpoints Available

### Patient APIs:
- `GET /api/v2/patients/me` - Get my profile
- `POST /api/v2/patients` - Create patient
- `POST /api/v2/patients/link-by-phone` - Link by phone number

### Reports APIs:
- `GET /api/v2/reports/me` - Get my reports
- `POST /api/v2/reports/upload` - Upload report file

### Upload APIs:
- `POST /api/v2/uploads/upload` - Upload file
- `GET /api/v2/uploads/my-uploads` - Get my uploads
- `DELETE /api/v2/uploads/:id` - Delete upload

## 🔧 Debug Commands

```powershell
# Check patient data
py check_patient.py

# Check tables
py check_tables.py

# Fix gender values (if needed)
py fix_gender.py

# View backend logs
# Check terminal: term_1789534334208_lwnfg7oh2l
```

## 📞 Contact

If still not working, share:
1. Screenshot of browser console errors
2. Screenshot of what you see (or don't see)
3. Phone number you're testing with
4. Whether using Demo mode or Real Firebase OTP

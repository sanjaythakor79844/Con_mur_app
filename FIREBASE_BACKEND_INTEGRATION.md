# 🔥 Complete Firebase + Backend Integration Guide

## 🎯 System Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Kiosk App         │         │   Lovable App       │
│ (kiosk-e6b59)       │         │ (this app)          │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           └───────────┬───────────────────┘
                       │
            ┌──────────▼──────────┐
            │  Firebase Auth      │
            │  Project: kiosk-e6b59│
            │  Phone OTP          │
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │  Backend API        │
            │  (Flask/Cloud Run)  │
            │  Port: 5001         │
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │  PostgreSQL DB      │
            │  (Shared Data)      │
            └─────────────────────┘
```

## ✅ What's Implemented

### 1. Firebase Authentication
- ✅ Same Firebase project as Kiosk app (`kiosk-e6b59`)
- ✅ Phone OTP authentication
- ✅ Auto token management
- ✅ Persistent login with `onAuthStateChanged`
- ✅ reCAPTCHA integration

### 2. Backend API Integration
- ✅ API service layer (`src/lib/api-service.ts`)
- ✅ JWT token management
- ✅ Patient profile APIs
- ✅ Health reports APIs
- ✅ Error handling

### 3. Authentication Flow
- ✅ Phone number input with validation
- ✅ OTP send via Firebase
- ✅ OTP verification
- ✅ Auto-create patient in backend after signup
- ✅ Check existing patient on signin
- ✅ Sync with localStorage

### 4. User Profile Management
- ✅ First Name, Last Name, Age, Gender
- ✅ Stored in both localStorage and backend
- ✅ Auto-sync on login

## 🔧 Configuration

### Environment Variables (.env)

```env
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:5001/api/v2

# Firebase Configuration (SAME AS KIOSK APP)
VITE_FIREBASE_API_KEY=AIzaSyCA89d5jpafJrB19XqS9MkwGlWja0GXZmI
VITE_FIREBASE_AUTH_DOMAIN=kiosk-e6b59.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kiosk-e6b59
VITE_FIREBASE_STORAGE_BUCKET=kiosk-e6b59.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=405281288207
VITE_FIREBASE_APP_ID=1:405281288207:web:0ed997bf9b7e5252dab37a
```

### Production Configuration

For production, update `.env`:

```env
VITE_API_BASE_URL=https://your-backend.run.app/api/v2
```

## 📱 API Endpoints

### Base URL
```
Development: http://localhost:5001/api/v2
Production: https://your-backend.run.app/api/v2
```

### Authentication
All requests require JWT token in header:
```
Authorization: Bearer <firebase_jwt_token>
```

### Patient APIs

#### Create Patient
```http
POST /patients
Content-Type: application/json
Authorization: Bearer <token>

{
  "mobile_number": "+919876543210",
  "full_name": "John Doe",
  "age": 30,
  "gender": "male"
}

Response:
{
  "patient": {
    "patient_id": 1,
    "mobile_number": "+919876543210",
    "full_name": "John Doe",
    "age": 30,
    "gender": "male",
    "firebase_uid": "xyz123",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get My Profile
```http
GET /patients/me
Authorization: Bearer <token>

Response:
{
  "patient": { ... }
}
```

#### Update My Profile
```http
PUT /patients/me
Content-Type: application/json
Authorization: Bearer <token>

{
  "full_name": "John Updated",
  "age": 31,
  "gender": "male"
}
```

### Report APIs

#### Get My Reports
```http
GET /reports/me
Authorization: Bearer <token>

Response:
{
  "reports": [
    {
      "report_id": 1,
      "patient_id": 1,
      "awis_score": 65.5,
      "prediction": {
        "risk_level": "moderate",
        "conditions": ["Hypertension"],
        "recommendations": ["Exercise daily", "Reduce salt"]
      },
      "report_data": {
        "blood_pressure": "140/90",
        "heart_rate": 85,
        "weight": 75,
        "bmi": 24.5
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Report
```http
POST /reports
Content-Type: application/json
Authorization: Bearer <token>

{
  "awis_score": 65.5,
  "prediction": {
    "risk_level": "moderate",
    "conditions": ["Hypertension"],
    "recommendations": ["Exercise daily"]
  },
  "report_data": {
    "blood_pressure": "140/90",
    "heart_rate": 85
  }
}
```

## 🔄 Cross-App Authentication Flow

### Scenario 1: Signup on This App → Login on Kiosk

```
1. User signs up on Lovable App
   - Phone: +919876543210
   - OTP verification ✅
   - Patient created in backend ✅

2. User opens Kiosk App
   - Enters same phone: +919876543210
   - OTP verification ✅
   - Loads same patient data ✅
   - Same reports visible ✅
```

### Scenario 2: Signup on Kiosk → Login on This App

```
1. User signs up on Kiosk App
   - Phone: +919999999999
   - Profile created in backend ✅
   - Reports generated ✅

2. User opens Lovable App
   - Enters same phone: +919999999999
   - OTP verification ✅
   - Loads same patient data ✅
   - Same reports visible ✅
```

## 🛠️ Implementation Details

### Files Structure

```
src/
├── lib/
│   ├── firebase.ts                 # Firebase initialization
│   ├── api-service.ts             # Backend API service
│   ├── user-profile.ts            # localStorage profile management
│   └── error-capture.ts           # Error handling
├── hooks/
│   └── use-auth.ts                # Auth hook with backend integration
├── routes/
│   └── login.tsx                  # Login/Signup with OTP
└── .env                           # Environment configuration
```

### Key Components

#### 1. Firebase Configuration (`src/lib/firebase.ts`)
- Shared config with Kiosk app
- Auto initialization
- HMR safe

#### 2. API Service (`src/lib/api-service.ts`)
- JWT token management
- Type-safe API calls
- Error handling
- Patient and Report APIs

#### 3. Auth Hook (`src/hooks/use-auth.ts`)
- Firebase auth state listener
- Auto token refresh
- Backend profile loading
- Reactive state management

#### 4. Login Component (`src/routes/login.tsx`)
- Phone OTP flow
- User profile collection
- Backend sync
- Error handling

## 🚀 Getting Started

### 1. Install Dependencies

Already installed in package.json:
- `firebase` - Firebase SDK
- Authentication handled via Firebase Auth

### 2. Start Backend Server

```bash
# In your backend directory
python app.py
# Server runs on http://localhost:5001
```

### 3. Start This App

```bash
npm run dev
# App runs on http://localhost:8080
```

### 4. Test Authentication

1. Go to http://localhost:8080/login
2. Enter phone number (10 digits)
3. Fill signup details (if new user)
4. Click "Send OTP"
5. Enter received OTP
6. Click "Verify OTP"
7. Redirected to /welcome

## 🔐 Firebase Console Setup

### Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `kiosk-e6b59`
3. Navigate to Authentication → Sign-in method
4. Enable "Phone" provider
5. Add authorized domains:
   - `localhost`
   - Your production domain

### Test Phone Numbers (Development)

For testing without real SMS:

1. Authentication → Sign-in method → Phone
2. Scroll to "Phone numbers for testing"
3. Add test numbers:
   - Phone: `+919876543210`
   - Code: `123456`

## 📊 Database Schema

### patients Table

```sql
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### reports Table

```sql
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(patient_id),
    awis_score DECIMAL(5,2),
    prediction JSONB,
    report_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Testing

### Test User Flow

1. **Signup Test**
```
Phone: 9876543210
Name: Test User
Age: 25
Gender: Male
OTP: (from Firebase)
Expected: Account created, redirected to /welcome
```

2. **Signin Test**
```
Phone: 9876543210 (existing)
OTP: (from Firebase)
Expected: Signed in, redirected to /welcome
```

3. **Backend Integration Test**
```bash
# Check if patient created
curl -H "Authorization: Bearer <token>" \
  http://localhost:5001/api/v2/patients/me
```

## 🐛 Troubleshooting

### Issue: "reCAPTCHA not initialized"
**Solution:** Ensure `recaptcha-container` div exists in DOM before calling `setupRecaptcha`

### Issue: "Patient not found in backend"
**Solution:** 
- Check backend server is running
- Verify API_BASE_URL in .env
- Check network tab for API errors

### Issue: "OTP not received"
**Solution:**
- Verify phone number format (+91 prefix)
- Check Firebase Console quotas
- Use test phone numbers for development

### Issue: "Token expired"
**Solution:** Auth hook automatically refreshes tokens via `onAuthStateChanged`

## 📝 Next Steps

### For Production:

1. **Deploy Backend**
   - Deploy Flask app to Google Cloud Run
   - Update VITE_API_BASE_URL in production .env
   - Set up proper database connection

2. **Configure reCAPTCHA**
   - Register production domain
   - Update Firebase settings

3. **Add Features**
   - View health reports in dashboard
   - Profile editing
   - Report generation
   - Push notifications

4. **Security**
   - Add rate limiting
   - Implement proper error handling
   - Add input validation
   - Set up monitoring

## 🎯 Summary

✅ **Same Firebase** → Both apps use `kiosk-e6b59`  
✅ **Same Phone Number** → Works across apps  
✅ **Same Backend** → Shared PostgreSQL database  
✅ **Same Patient Data** → Synced in real-time  
✅ **Vice Versa Login** → Signup anywhere, login anywhere  

**The integration is complete and ready to use!** 🚀

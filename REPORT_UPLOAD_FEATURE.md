# 📤 Report Upload Feature - Vice Versa Complete!

## ✅ What's Been Created

**New Page:** `/upload-report`

Patient is app se health report upload kar sakta hai jo **Kiosk database me save hoga** aur Kiosk pe dikhega!

---

## 🔄 Complete Vice Versa Flow

### This App → Kiosk

```
1. Patient logs in on this app
   ├─ Phone: +919876543210
   └─ Profile loaded from DB_AHHA

2. Patient goes to /upload-report
   ├─ Fills health screening data:
   │  ├─ AWIS Score: 75.5
   │  ├─ Risk Level: Moderate
   │  ├─ Vitals: BP, HR, Weight, etc.
   │  ├─ Conditions: Hypertension, Diabetes
   │  └─ Recommendations: Exercise, Diet control
   └─ Clicks "Upload Report to Kiosk"

3. API Call: POST /reports
   ├─ Saves to DB_AHHA PostgreSQL
   └─ Report ID: 123

4. Patient goes to Kiosk (same phone)
   ├─ Kiosk calls: GET /reports/me
   └─ Shows report from this app! ✅
```

### Kiosk → This App

```
1. Patient does screening on Kiosk
   └─ Report saved to DB_AHHA

2. Patient logs in on this app (same phone)
   ├─ App calls: GET /reports/me
   └─ Shows Kiosk report! ✅
```

---

## 📋 Form Fields

### Required Fields:
- ✅ **AWIS Score** (0-100)
- ✅ **Risk Level** (Low/Moderate/High)

### Optional Fields (Vitals):
- Blood Pressure (e.g., 120/80)
- Heart Rate (bpm)
- Weight (kg)
- Height (cm)
- Temperature (°F)
- SpO2 (%)
- **Auto-calculates BMI** if weight and height provided

### Optional Fields (Medical):
- Detected Conditions (comma-separated)
- Recommendations (one per line)
- Additional Notes

---

## 🎨 UI Features

### Page Header:
- Patient name and ID display
- "Upload to Kiosk Database" indicator

### Form Sections:
1. **AWIS Score Input** - Number field with validation
2. **Risk Level Selector** - 3 color-coded buttons
3. **Vital Signs Card** - Grid layout for all vitals
4. **BMI Calculator** - Auto-calculates from weight/height
5. **Conditions Input** - Comma-separated text
6. **Recommendations** - Multi-line textarea
7. **Notes** - Additional observations

### Submit Button:
- Shows "Uploading to Kiosk..." while loading
- Animated pulse effect during upload
- Success toast with Report ID
- Auto-redirects to /reports page

---

## 🔗 How to Access

### Add Link in Navigation

Update `src/routes/home.tsx` or `src/routes/reports.tsx`:

```typescript
<Btn to="/upload-report" icon="upload">
  Upload Health Report
</Btn>
```

### Or Direct URL:
```
http://localhost:8080/upload-report
```

---

## 📊 API Integration

### API Call:
```typescript
await apiService.createReport({
  awis_score: 75.5,
  prediction: {
    risk_level: "moderate",
    conditions: ["Hypertension", "Diabetes"],
    recommendations: [
      "Regular monitoring needed",
      "Exercise daily for 30 minutes"
    ]
  },
  report_data: {
    blood_pressure: "130/85",
    heart_rate: 78,
    weight: 75,
    height: 175,
    bmi: 24.5,
    temperature: 98.6,
    spo2: 98,
    test_date: "2024-01-15",
    notes: "Patient complained of mild headache"
  }
});
```

### Backend Endpoint:
```
POST http://localhost:5000/api/v2/reports
Authorization: Bearer <firebase_jwt_token>
```

### Response:
```json
{
  "message": "Report created successfully",
  "report": {
    "report_id": 123,
    "patient_id": 1,
    "awis_score": 75.5,
    "prediction": {
      "risk_level": "moderate",
      "conditions": ["Hypertension", "Diabetes"],
      "recommendations": ["Regular monitoring needed"]
    },
    "report_data": {
      "blood_pressure": "130/85",
      "heart_rate": 78,
      "weight": 75,
      "bmi": 24.5
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

## 🧪 Testing Flow

### Step 1: Login
```
1. Go to http://localhost:8080/login
2. Login with phone
3. Complete profile if needed
```

### Step 2: Upload Report
```
1. Go to http://localhost:8080/upload-report
2. Fill required fields:
   - AWIS Score: 75.5
   - Risk Level: Moderate
3. Fill optional vitals:
   - BP: 130/85
   - HR: 78
   - Weight: 75
   - Height: 175
4. Add conditions: Hypertension, Diabetes
5. Add recommendations:
   - Regular monitoring needed
   - Exercise daily
6. Click "Upload Report to Kiosk"
```

### Step 3: Verify
```
1. Check console logs:
   ✅ Report created: {...}
   
2. Success toast shows:
   "Report uploaded successfully!"
   "Report ID: 123"
   
3. Auto-redirects to /reports
   
4. See uploaded report in list ✅
```

### Step 4: Check on Kiosk
```
1. Go to Kiosk with same phone number
2. Kiosk calls: GET /reports/me
3. Should see report from this app! ✅
```

---

## 🎯 Validation

### Required Field Validation:
- AWIS Score must be 0-100
- Risk level must be selected

### Optional Field Validation:
- Weight, Height: Positive numbers
- Heart Rate: Positive integer
- SpO2: 0-100
- Temperature: Realistic range

### Auto-calculations:
- BMI = Weight / (Height in meters)²
- Shows only if both weight and height provided

---

## 🔐 Security

### Authentication:
- ✅ RequireAuth wrapper - Must be logged in
- ✅ Firebase JWT token sent to backend
- ✅ Patient profile checked before submission

### Data Validation:
- ✅ Frontend validation
- ✅ Backend validation in API
- ✅ Proper error handling

---

## 📱 Mobile Responsive

- ✅ Full-width on mobile
- ✅ Grid layout for vitals
- ✅ Touch-friendly buttons
- ✅ Scrollable form
- ✅ Sticky submit button

---

## 🚀 Production Deployment

### Before Deploy:

1. **Backend Running:**
   ```bash
   cd backend
   python app.py
   # Running on http://localhost:5000
   ```

2. **Test Locally:**
   ```
   - Upload report ✅
   - Check /reports page ✅
   - Verify in database ✅
   ```

3. **Update .env for Production:**
   ```env
   VITE_API_BASE_URL=https://your-backend.run.app/api/v2
   ```

---

## 📊 Database Structure

### Report Saved As:

```sql
INSERT INTO reports (
  patient_id,
  awis_score,
  prediction,
  report_data,
  created_at
) VALUES (
  1,
  75.5,
  '{"risk_level": "moderate", "conditions": ["Hypertension"]}',
  '{"blood_pressure": "130/85", "heart_rate": 78}',
  NOW()
);
```

---

## 🎉 Summary

### ✅ Created:
- Report upload page
- Full form with all fields
- API integration
- Validation and error handling
- Success feedback
- Auto-redirect

### ✅ Vice Versa Working:
- This App → Kiosk ✅
- Kiosk → This App ✅
- Same database ✅
- Real-time sync ✅

### 🎯 Ready to Use:
1. Start backend: `python app.py`
2. Go to: `http://localhost:8080/upload-report`
3. Fill form and upload ✅
4. Check on Kiosk ✅

---

**Report upload feature complete! Ab patient is app se report upload kar sakta hai jo Kiosk pe dikhe ga!** 🚀

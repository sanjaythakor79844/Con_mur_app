# 🚀 API Usage Examples - DB_AHHA Backend

## ✅ APIs Already Integrated

Aapki saari APIs already integrated hain `src/lib/api-service.ts` me. Ab bas use karna hai.

---

## 📱 Current Usage in App

### 1. Login Flow (`src/routes/login.tsx`)

```typescript
// OTP verification ke baad automatically:

// ✅ Check if patient exists
const profile = await apiService.getMyProfile();

// ✅ Create patient if new user
await apiService.createPatient({
  mobile_number: "+919876543210",
  full_name: "Vinay Kumar",
  age: 28,
  gender: "male"
});
```

### 2. Auth Hook (`src/hooks/use-auth.ts`)

```typescript
// User login par automatically patient profile load hota hai
useEffect(() => {
  if (firebaseUser) {
    const token = await firebaseUser.getIdToken();
    apiService.setToken(token);
    
    // ✅ Auto-load profile
    const response = await apiService.getMyProfile();
    setPatient(response.patient);
  }
}, []);
```

---

## 🎯 How to Use APIs in Your Components

### Example 1: Get My Reports (Dashboard)

```typescript
// File: src/routes/reports.tsx
import { useEffect, useState } from 'react';
import { apiService, type Report } from '@/lib/api-service';

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      // 🔥 API CALL: GET /reports/me
      const response = await apiService.getMyReports();
      setReports(response.reports);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>My Health Reports ({reports.length})</h1>
      {reports.map(report => (
        <div key={report.report_id}>
          <h3>Report #{report.report_id}</h3>
          <p>AWIS Score: {report.awis_score}</p>
          <p>Risk: {report.prediction.risk_level}</p>
          <p>Date: {new Date(report.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Create Report (Upload from This App)

```typescript
// File: src/routes/create-report.tsx
import { useState } from 'react';
import { apiService } from '@/lib/api-service';
import { toast } from 'sonner';

export function CreateReportPage() {
  const [awisScore, setAwisScore] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 🔥 API CALL: POST /reports
      const response = await apiService.createReport({
        awis_score: parseFloat(awisScore),
        prediction: {
          risk_level: 'moderate',
          conditions: ['hypertension'],
          recommendations: ['Regular monitoring', 'Exercise daily']
        },
        report_data: {
          blood_pressure: bloodPressure,
          heart_rate: parseInt(heartRate),
          weight: 75,
          height: 175,
          bmi: 24.5
        }
      });

      toast.success('Report created successfully!');
      console.log('Created report:', response.report);
      
      // Navigate to reports page or show success
    } catch (error) {
      toast.error('Failed to create report');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create Health Report</h1>
      
      <input
        type="number"
        placeholder="AWIS Score"
        value={awisScore}
        onChange={(e) => setAwisScore(e.target.value)}
      />
      
      <input
        type="text"
        placeholder="Blood Pressure (e.g., 120/80)"
        value={bloodPressure}
        onChange={(e) => setBloodPressure(e.target.value)}
      />
      
      <input
        type="number"
        placeholder="Heart Rate"
        value={heartRate}
        onChange={(e) => setHeartRate(e.target.value)}
      />
      
      <button type="submit">Create Report</button>
    </form>
  );
}
```

### Example 3: Update Profile

```typescript
// File: src/routes/profile-edit.tsx
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function ProfileEditPage() {
  const { patient } = useAuth();
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');

  useEffect(() => {
    if (patient) {
      setFullName(patient.full_name);
      setAge(patient.age.toString());
    }
  }, [patient]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 🔥 API CALL: PUT /patients/me
      const response = await apiService.updateMyProfile({
        full_name: fullName,
        age: parseInt(age)
      });

      toast.success('Profile updated successfully!');
      console.log('Updated profile:', response.patient);
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleUpdate}>
      <h1>Edit Profile</h1>
      
      <input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      
      <input
        type="number"
        placeholder="Age"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />
      
      <button type="submit">Update Profile</button>
    </form>
  );
}
```

### Example 4: Admin Dashboard (View All Reports)

```typescript
// File: src/routes/admin/reports.tsx
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';

export function AdminReportsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [mobileFilter, setMobileFilter] = useState('');

  const loadReports = async () => {
    try {
      // 🔥 API CALL: GET /admin/reports or GET /admin/reports?mobile=+91...
      const response = await apiService.getAdminReports(
        mobileFilter || undefined
      );
      setResults(response.results);
    } catch (error) {
      console.error('Failed to load admin reports:', error);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      <input
        type="text"
        placeholder="Filter by mobile (e.g., +919876543210)"
        value={mobileFilter}
        onChange={(e) => setMobileFilter(e.target.value)}
      />
      <button onClick={loadReports}>Filter</button>

      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Mobile</th>
            <th>Report ID</th>
            <th>AWIS Score</th>
            <th>Risk Level</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, idx) => (
            <tr key={idx}>
              <td>{result.full_name}</td>
              <td>{result.mobile_number}</td>
              <td>{result.report_id}</td>
              <td>{result.awis_score}</td>
              <td>{result.prediction?.risk_level}</td>
              <td>{new Date(result.report_created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Example 5: Health Check

```typescript
// Check backend health
const checkBackendHealth = async () => {
  try {
    // 🔥 API CALL: GET /health
    const response = await apiService.checkHealth();
    console.log('Backend Status:', response.status);
    console.log('Database:', response.database);
    console.log('DB Name:', response.database_name);
  } catch (error) {
    console.error('Backend is down!', error);
  }
};
```

---

## 🔄 Complete Flow: Kiosk → This App

### Scenario: User does screening on Kiosk, then logs in here

```typescript
// 1. User completes screening on Kiosk
// Kiosk creates report via: POST /reports

// 2. User logs in on this app with same phone
// Firebase OTP authentication

// 3. App automatically loads patient profile
const profile = await apiService.getMyProfile();
// Returns: { patient_id, mobile_number, full_name, age, gender }

// 4. App loads all reports
const { reports } = await apiService.getMyReports();
// Returns: Array of all reports including the one from Kiosk

// 5. User sees Kiosk report in dashboard! ✅
```

### Scenario: User creates report on This App, then checks on Kiosk

```typescript
// 1. User fills report form on this app
const response = await apiService.createReport({
  awis_score: 75.5,
  prediction: {
    risk_level: 'moderate',
    conditions: ['Hypertension'],
    recommendations: ['Exercise regularly']
  },
  report_data: {
    blood_pressure: '130/85',
    heart_rate: 78
  }
});

// 2. Report is saved in database with patient_id

// 3. User goes to Kiosk with same phone number

// 4. Kiosk calls: GET /reports/me
// Returns: All reports including the one created on this app

// 5. User sees this app's report on Kiosk! ✅
```

---

## 📊 API Response Examples

### GET /patients/me

```json
{
  "patient": {
    "patient_id": 1,
    "mobile_number": "+917984460572",
    "full_name": "Vinay Kumar",
    "age": 28,
    "gender": "male",
    "firebase_uid": "abc123xyz",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /reports/me

```json
{
  "reports": [
    {
      "report_id": 1,
      "patient_id": 1,
      "awis_score": 75.5,
      "prediction": {
        "risk_level": "moderate",
        "conditions": ["hypertension"],
        "recommendations": ["Regular monitoring", "Exercise daily"]
      },
      "report_data": {
        "blood_pressure": "130/85",
        "heart_rate": 78,
        "weight": 75,
        "bmi": 24.5
      },
      "created_at": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

### POST /reports

```json
{
  "message": "Report created successfully",
  "report": {
    "report_id": 2,
    "patient_id": 1,
    "awis_score": 80.0,
    "prediction": {
      "risk_level": "low",
      "conditions": [],
      "recommendations": ["Good health"]
    },
    "report_data": {
      "blood_pressure": "120/80",
      "heart_rate": 72
    },
    "created_at": "2024-01-16T09:00:00.000Z"
  }
}
```

---

## 🎯 Summary

✅ **APIs Already Integrated** in `src/lib/api-service.ts`  
✅ **Login Flow** uses `createPatient()` and `getMyProfile()`  
✅ **Auth Hook** auto-loads patient profile  
✅ **Token Management** handled automatically  

### Aapko Bas Ye Karna Hai:

1. **Reports Dashboard** banao → `getMyReports()` use karo
2. **Create Report Form** banao → `createReport()` use karo
3. **Profile Edit** banao → `updateMyProfile()` use karo
4. **Admin Panel** banao → `getAdminReports()` use karo

**APIs ready hain, bas UI components me use karo!** 🚀

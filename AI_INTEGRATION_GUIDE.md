# 🤖 AI Integration Guide - Aaha Health Pulse

> **Quick reference for AI tools, code generators, and automation**

---

## 📦 Quick Project Info

```yaml
Project: Aaha Health Pulse
Type: Full-stack Health Monitoring Platform
Frontend: React + TypeScript + TanStack Router + Tailwind
Backend: Flask + SQLAlchemy + Firebase Auth
Database: SQLite (dev) / PostgreSQL (prod)
AI Services: Google Gemini (OCR, Translation, Risk Assessment)
```

---

## 🗂️ Project Structure

```
health-pulse-fix-main/
├── src/
│   ├── routes/              # Page components
│   │   ├── home.tsx         # Dashboard
│   │   ├── login.tsx        # Authentication
│   │   ├── upload.tsx       # File upload
│   │   ├── reports.tsx      # Reports list
│   │   └── profile.tsx      # User profile
│   ├── components/          # Reusable components
│   │   ├── ui/              # shadcn/ui components
│   │   └── require-auth.tsx # Auth wrapper
│   ├── lib/                 # Utilities
│   │   ├── api-service.ts   # Backend API client
│   │   ├── firebase.ts      # Firebase config
│   │   └── utils.ts         # Helper functions
│   ├── hooks/               # React hooks
│   │   └── use-auth.ts      # Authentication hook
│   └── styles/              # Global styles
├── .env                     # Environment variables
└── package.json             # Dependencies

CHWapp-main/
├── app/
│   ├── models/              # SQLAlchemy models
│   │   ├── patient.py       # Patient model
│   │   └── upload.py        # Upload model
│   ├── routes/              # API endpoints
│   │   ├── frontend_api.py  # Consumer app APIs
│   │   ├── uploads.py       # File upload APIs
│   │   └── api.py           # Ambika APIs
│   ├── services/            # Business logic
│   │   ├── adaptive_conversation.py  # Ambika AI
│   │   └── voice_workflow_service.py # TTS/STT
│   └── utils/               # Utilities
│       └── auth.py          # Token validation
├── .env                     # Environment variables
└── requirements.txt         # Python dependencies
```

---

## 🔑 Key Data Models

### Patient (TypeScript)
```typescript
interface Patient {
  patient_id: string;        // "P4981826100"
  firebase_uid: string;      // "abc123xyz"
  full_name: string;         // "Sanjay Thakor"
  age: number;               // 25
  gender: "Male" | "Female" | "Other";
  phone_number: string;      // "+917777777777"
  created_at: string;        // ISO date
}
```

### Report (TypeScript)
```typescript
interface Report {
  report_id: number;
  patient_id: string;
  awis_score: number;        // 0-100
  prediction: {
    risk_level: "low" | "moderate" | "high";
    conditions?: string[];
    recommendations?: string[];
  };
  report_data?: {
    blood_pressure?: string;
    heart_rate?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    spo2?: number;
    [key: string]: any;
  };
  created_at: string;
}
```

### Upload (TypeScript)
```typescript
interface Upload {
  upload_id: number;
  patient_id: string;
  filename: string;          // UUID-based
  original_filename: string; // User's filename
  file_path: string;
  file_size: number;         // Bytes
  file_type: string;         // MIME type
  report_type: string;       // "lh_fsh", "hemoglobin", etc.
  description: string;
  uploaded_at: string;
}
```

---

## 🔌 API Client Pattern

### Initialize Client
```typescript
import { apiService } from '@/lib/api-service';

// Set auth token (after Firebase login)
const token = await firebaseUser.getIdToken();
apiService.setToken(token);
```

### Make API Calls
```typescript
// Get patient profile
const { patient } = await apiService.getMyProfile();

// Create patient
const result = await apiService.createPatient({
  mobile_number: "+917777777777",
  full_name: "Test User",
  age: 25,
  gender: "Male"
});

// Upload file
const upload = await apiService.uploadReport(
  fileObject,
  "hemoglobin",
  "Blood test results"
);

// Get reports
const { reports } = await apiService.getMyReports();
```

---

## 🔐 Authentication Patterns

### Consumer App (Firebase)
```typescript
// Login with phone OTP
import { auth } from '@/lib/firebase';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

// 1. Send OTP
const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container');
const confirmationResult = await signInWithPhoneNumber(
  auth, 
  phoneNumber, 
  appVerifier
);

// 2. Verify OTP
const result = await confirmationResult.confirm(otp);
const token = await result.user.getIdToken();

// 3. Set token in API client
apiService.setToken(token);

// 4. Get/create patient profile
try {
  const { patient } = await apiService.getMyProfile();
} catch (error) {
  // Try linking by phone or create new
  await apiService.linkPatientByPhone(phoneNumber);
}
```

### Demo Mode
```typescript
// For testing without real Firebase
const mockToken = `demo_token_demo_7777777777_${Date.now()}`;
apiService.setToken(mockToken);

// Backend auto-validates demo tokens
```

---

## 📤 File Upload Pattern

```typescript
// Frontend component
const handleUpload = async (file: File, reportType: string) => {
  try {
    // Optional: OCR extraction first
    if (file.type.startsWith('image/')) {
      const extractedData = await extractReportData(file, reportType);
      console.log('Extracted:', extractedData);
    }
    
    // Upload to backend
    const result = await apiService.uploadReport(
      file,
      reportType,
      description
    );
    
    toast.success("File uploaded successfully!");
    return result.upload;
  } catch (error) {
    toast.error("Upload failed: " + error.message);
  }
};
```

---

## 🗄️ Database Queries (Backend)

### Common Queries

```python
from app.models import Patient, Upload
from app.extensions import db

# Get patient by Firebase UID
patient = Patient.query.filter_by(firebase_uid=firebase_uid).first()

# Get patient by phone number
patient = Patient.query.filter_by(phone_number=phone).first()

# Get all uploads for patient
uploads = Upload.query.filter_by(patient_id=patient_id)\
    .order_by(Upload.uploaded_at.desc())\
    .all()

# Create new patient
patient = Patient(
    patient_id=f"P{int(time.time() * 1000000) % 10000000000}",
    firebase_uid=firebase_uid,
    full_name=full_name,
    age=age,
    gender=gender,
    phone_number=phone_number
)
db.session.add(patient)
db.session.commit()

# Update patient
patient.firebase_uid = new_uid
db.session.commit()

# Delete upload
db.session.delete(upload)
db.session.commit()
```

---

## 🎨 Component Patterns

### Protected Route
```typescript
import { RequireAuth } from '@/components/require-auth';

function ProtectedPage() {
  return (
    <RequireAuth>
      <div>Protected content</div>
    </RequireAuth>
  );
}
```

### Use Auth Hook
```typescript
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, patient, loading, session } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginPrompt />;
  
  return (
    <div>
      <h1>Welcome, {patient?.full_name}</h1>
      <p>Age: {patient?.age}</p>
    </div>
  );
}
```

### File Upload Component
```typescript
import { useState } from 'react';
import { apiService } from '@/lib/api-service';

function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await apiService.uploadReport(file, 'hemoglobin');
      alert('Upload successful!');
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files?.[0] || null)} 
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}
```

---

## 🔧 Common Backend Patterns

### Create API Endpoint
```python
from flask import Blueprint, request, jsonify
from app.utils.auth import token_required

bp = Blueprint('my_api', __name__, url_prefix='/api/v2/my-feature')

@bp.route('/data', methods=['GET', 'OPTIONS'])
@token_required
def get_data(current_user):
    """Get user data"""
    patient_id = current_user.get('uid')
    
    # Query database
    data = MyModel.query.filter_by(patient_id=patient_id).all()
    
    return jsonify({
        'data': [item.to_dict() for item in data]
    }), 200

@bp.route('/data', methods=['POST', 'OPTIONS'])
@token_required
def create_data(current_user):
    """Create new data"""
    data = request.get_json()
    
    # Validate
    if not data.get('required_field'):
        return jsonify({'error': 'Required field missing'}), 400
    
    # Create
    item = MyModel(**data)
    db.session.add(item)
    db.session.commit()
    
    return jsonify({
        'message': 'Created successfully',
        'data': item.to_dict()
    }), 201
```

### Register Blueprint
```python
# app/routes/__init__.py
from .my_api import bp as my_api_bp

def register_blueprints(app):
    app.register_blueprint(my_api_bp)
```

---

## 🧪 Testing Patterns

### Frontend Testing (Vitest)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { apiService } from '@/lib/api-service';

describe('MyComponent', () => {
  it('displays patient name', async () => {
    // Mock API
    vi.spyOn(apiService, 'getMyProfile').mockResolvedValue({
      patient: {
        patient_id: 'P123',
        full_name: 'Test User',
        age: 25,
        gender: 'Male'
      }
    });
    
    render(<MyComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
```

### Backend Testing (pytest)
```python
import pytest
from app import create_app
from app.extensions import db

@pytest.fixture
def client():
    app = create_app({'TESTING': True})
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

def test_get_patient(client):
    # Create test patient
    patient = Patient(
        patient_id='TEST123',
        full_name='Test User',
        firebase_uid='test_uid'
    )
    db.session.add(patient)
    db.session.commit()
    
    # Test endpoint
    response = client.get(
        '/api/v2/patients/me',
        headers={'Authorization': 'Bearer demo_token_test_uid_123'}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['patient']['full_name'] == 'Test User'
```

---

## 🚀 Deployment Checklist

### Frontend
```bash
# 1. Build
npm run build

# 2. Test build locally
npm run preview

# 3. Environment variables set in Render:
- VITE_API_BASE_URL
- VITE_FIREBASE_* (all 6 variables)

# 4. Build settings:
Build Command: npm install && npm run build
Publish Directory: dist
```

### Backend
```bash
# 1. Test locally
python run.py

# 2. Environment variables set in Render:
- SECRET_KEY (generate new!)
- DATABASE_URL (auto from Render PostgreSQL)
- FLASK_ENV=production
- FLASK_CORS_ORIGINS (frontend URL)
- GEMINI_API_KEY (optional)

# 3. Build settings:
Build Command: pip install -r requirements.txt
Start Command: gunicorn run:app
```

---

## 🎯 AI Code Generation Prompts

### Generate API Client
```
Generate a TypeScript API client for the following endpoint:

Endpoint: POST /api/v2/patients
Auth: Bearer token required
Request: { mobile_number, full_name, age, gender }
Response: { message, patient: { patient_id, ... } }

Follow the pattern in @/lib/api-service.ts
Use fetch API with error handling
Include TypeScript types
```

### Generate React Component
```
Create a React component for displaying patient vitals:

Data structure:
- systolic: number
- diastolic: number
- heart_rate: number
- spo2: number
- temperature: number

Requirements:
- Use Tailwind CSS
- Show color-coded alerts (green/yellow/red)
- Use Lucide icons
- TypeScript
- Responsive design
```

### Generate Database Model
```
Create a SQLAlchemy model for a new "appointments" table:

Fields:
- appointment_id (primary key, auto-increment)
- patient_id (foreign key to patient)
- appointment_date (date)
- appointment_time (time)
- status (enum: scheduled, completed, cancelled)
- notes (text, optional)
- created_at (timestamp)

Follow the pattern in app/models/patient.py
Include to_dict() method
Add appropriate indexes
```

---

## 📊 Performance Optimization Tips

### Frontend
```typescript
// 1. Use React Query for caching
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['patient'],
  queryFn: () => apiService.getMyProfile()
});

// 2. Lazy load images
<img loading="lazy" src={src} alt={alt} />

// 3. Code splitting
const Reports = lazy(() => import('./routes/reports'));

// 4. Debounce search inputs
const debouncedSearch = useDebouncedValue(searchTerm, 500);
```

### Backend
```python
# 1. Add database indexes
CREATE INDEX idx_patient_phone ON patient(phone_number);
CREATE INDEX idx_patient_firebase ON patient(firebase_uid);

# 2. Use pagination
patients = Patient.query.paginate(page=1, per_page=20)

# 3. Eager loading (avoid N+1)
patients = Patient.query.options(
    db.joinedload(Patient.uploads)
).all()

# 4. Cache frequently accessed data
from functools import lru_cache

@lru_cache(maxsize=128)
def get_patient_cached(patient_id):
    return Patient.query.get(patient_id)
```

---

## 🔍 Debugging Tips

### Frontend
```typescript
// Enable detailed logging
console.log('[API] Request:', endpoint, data);
console.log('[API] Response:', response);

// Check auth state
console.log('[Auth] User:', user);
console.log('[Auth] Token:', session?.token);

// Network tab in DevTools
// - Check request headers (Authorization)
// - Check response status codes
// - View request/response payloads
```

### Backend
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Log incoming requests
logger.info(f"Request: {request.method} {request.path}")
logger.info(f"Headers: {dict(request.headers)}")
logger.info(f"Body: {request.get_json()}")

# Log database queries
app.config['SQLALCHEMY_ECHO'] = True
```

---

## 📝 Code Style Guidelines

### TypeScript
```typescript
// Use const/let, not var
const API_URL = "...";
let counter = 0;

// Explicit types for function params
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Interface over type for objects
interface User {
  id: string;
  name: string;
}

// Named exports preferred
export const myFunction = () => { ... };
export interface MyInterface { ... }
```

### Python
```python
# PEP 8 style
# - 4 spaces for indentation
# - snake_case for variables/functions
# - PascalCase for classes
# - UPPER_CASE for constants

# Type hints
def get_patient(patient_id: str) -> Patient:
    return Patient.query.get(patient_id)

# Docstrings
def my_function(param: str) -> dict:
    """
    Brief description.
    
    Args:
        param: Description of param
    
    Returns:
        Description of return value
    """
    pass
```

---

## 🎓 Learning Resources

### Frontend
- React: https://react.dev
- TanStack Router: https://tanstack.com/router
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com

### Backend
- Flask: https://flask.palletsprojects.com
- SQLAlchemy: https://www.sqlalchemy.org
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

### AI/ML
- Gemini API: https://ai.google.dev
- Google Cloud TTS: https://cloud.google.com/text-to-speech
- Google Cloud STT: https://cloud.google.com/speech-to-text

---

**End of AI Integration Guide** 🤖

Use this with COMPLETE_DOCUMENTATION.md for full project understanding.

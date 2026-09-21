# 📱 Aaha Health Pulse - Complete Documentation

> **Version**: 2.0  
> **Last Updated**: September 16, 2026  
> **Architecture**: React Frontend + Flask Backend + Firebase Auth + SQLite Database

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Backend API Documentation](#backend-api-documentation)
6. [Frontend Features](#frontend-features)
7. [Authentication Flow](#authentication-flow)
8. [File Upload System](#file-upload-system)
9. [Data Sync Between Apps](#data-sync-between-apps)
10. [Environment Configuration](#environment-configuration)
11. [Deployment Guide](#deployment-guide)
12. [Development Setup](#development-setup)

---

## 🎯 Overview

Aaha Health Pulse is a comprehensive health screening and monitoring platform consisting of two integrated applications:

### **Consumer App (Health Pulse)**
- Patient-facing mobile-first web application
- Self-service health screening and report management
- Firebase phone OTP authentication
- Report upload and OCR processing
- Personal health dashboard

### **Kiosk App (CHW Helper)**
- Community Health Worker (CHW) operated application
- In-person health screenings with medical devices
- Adaptive multilingual conversation flow
- Real-time vital measurements
- Administrative dashboard

### **Key Features**
- 🔐 Secure Firebase phone authentication
- 📊 AWIS (Aaha Wellness Index Score) calculation
- 📸 Medical report OCR and extraction
- 🏥 Multi-device health screening support (BP, SpO2, ECG, etc.)
- 🗣️ Voice-enabled multilingual interface (Hindi, English, Marathi, etc.)
- 📱 Progressive Web App (PWA) support
- 🔄 Real-time data synchronization
- 📈 Health analytics and risk prediction

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Consumer App (React)         │    Kiosk App (Flask Templates)  │
│  - TanStack Router            │    - Jinja2 Templates           │
│  - Firebase Auth              │    - Flask Login                │
│  - Tailwind CSS               │    - Adaptive UI                │
│  - TypeScript                 │    - Voice Interface            │
└──────────────┬────────────────┴──────────────┬──────────────────┘
               │                                │
               │        Firebase Auth           │
               │    ┌───────────────────┐       │
               └────┤  Phone OTP Auth   ├───────┘
                    └───────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                     BACKEND API LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│                    Flask REST API (Port 5001)                    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Patient    │  │   Reports    │  │   Uploads    │          │
│  │     API      │  │     API      │  │     API      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Ambika     │  │   Devices    │  │    Admin     │          │
│  │  Adaptive    │  │   Gateway    │  │     API      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                    SERVICES LAYER                                │
├──────────────────────────────────────────────────────────────────┤
│  • Gemini AI (OCR, Translation, Risk Assessment)                 │
│  • Google Cloud TTS/STT (Voice)                                  │
│  • Firebase Admin SDK (Token Validation)                         │
│  • Device Gateway (Medical Devices)                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                    DATABASE LAYER                                │
├──────────────────────────────────────────────────────────────────┤
│                    SQLite (Development)                          │
│                  PostgreSQL (Production)                         │
│                                                                   │
│  Tables: patient, clinical_visit, vitals, reports, uploads,     │
│          user, risk_factor, consent, workflow_output            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### **Frontend (Consumer App)**
```json
{
  "framework": "React 18",
  "routing": "TanStack Router",
  "styling": "Tailwind CSS + shadcn/ui",
  "language": "TypeScript",
  "build": "Vite",
  "auth": "Firebase Authentication",
  "state": "React Query (TanStack Query)",
  "forms": "React Hook Form + Zod",
  "ui": "Radix UI + Lucide Icons"
}
```

### **Backend API**
```json
{
  "framework": "Flask 3.0",
  "database": "SQLAlchemy ORM",
  "auth": "Flask-Login + Firebase Admin SDK",
  "migrations": "Flask-Migrate (Alembic)",
  "cors": "Flask-CORS",
  "validation": "Pydantic (optional)",
  "logging": "Python logging module"
}
```

### **AI/ML Services**
```json
{
  "llm": "Google Gemini API (gemini-1.5-flash)",
  "tts": "Google Cloud Text-to-Speech",
  "stt": "Google Cloud Speech-to-Text",
  "ocr": "Gemini Vision API",
  "translation": "Gemini + Literal Translation"
}
```

### **Infrastructure**
```json
{
  "hosting": "Render.com / Cloud Run",
  "database": "PostgreSQL (Render) / SQLite (Local)",
  "storage": "Local File System / GCS",
  "auth": "Firebase Authentication",
  "cdn": "Firebase Hosting (Optional)"
}
```

---

## 🗃️ Database Schema

### **1. patient** (Core Patient Table)
Primary patient demographics and identification.

```sql
CREATE TABLE patient (
    patient_id VARCHAR(20) PRIMARY KEY,           -- Unique ID: P{timestamp} or KIOSK-{timestamp}
    firebase_uid VARCHAR(128) UNIQUE,             -- Firebase Auth UID (for consumer app linking)
    full_name VARCHAR(100) NOT NULL,              -- Patient full name
    age INTEGER,                                  -- Age in years
    gender VARCHAR(10) CHECK(gender IN ('Male', 'Female', 'Other')),
    phone_number VARCHAR(20),                     -- Mobile number with country code
    address TEXT,                                 -- Full address
    village VARCHAR(100),                         -- Village/area name
    state VARCHAR(50),                            -- State
    pin_code VARCHAR(10),                         -- Postal code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_patient_phone ON patient(phone_number);
CREATE INDEX idx_patient_firebase ON patient(firebase_uid);
```

**Sample Data:**
```sql
INSERT INTO patient VALUES (
    'P4981826100',
    'demo_7777777777',
    'Demo User',
    25,
    'Male',
    '+917777777777',
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-09-16 04:58:04',
    '2026-09-16 04:58:04'
);
```

---

### **2. clinical_visit** (Visit Records)
Tracks each patient visit/screening session.

```sql
CREATE TABLE clinical_visit (
    visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    visit_date DATE,
    visit_type VARCHAR(50),                       -- 'screening', 'follow-up', 'emergency'
    chw_id VARCHAR(50),                           -- Community Health Worker ID
    location VARCHAR(100),                        -- Visit location
    notes TEXT,                                   -- Clinical notes
    workflow_type VARCHAR(50),                    -- 'general', 'pcos', 'diabetes', etc.
    session_data TEXT,                            -- JSON: Ambika conversation state
    status VARCHAR(20) DEFAULT 'active',          -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE INDEX idx_visit_patient ON clinical_visit(patient_id);
CREATE INDEX idx_visit_date ON clinical_visit(visit_date);
```

---

### **3. vitals** (Vital Measurements)
Stores all vital sign measurements from devices.

```sql
CREATE TABLE vitals (
    vital_id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER,
    patient_id VARCHAR(20) NOT NULL,
    
    -- Blood Pressure
    systolic INTEGER,                             -- mmHg
    diastolic INTEGER,                            -- mmHg
    bp_flag VARCHAR(10),                          -- 'green', 'yellow', 'red'
    
    -- Oxygen Saturation
    spo2 INTEGER,                                 -- Percentage
    pulse_rate INTEGER,                           -- BPM
    spo2_flag VARCHAR(10),
    
    -- Body Measurements
    weight REAL,                                  -- kg
    height REAL,                                  -- cm
    bmi REAL,                                     -- Calculated
    bmi_flag VARCHAR(10),
    
    -- Temperature
    temperature REAL,                             -- Celsius
    temp_flag VARCHAR(10),
    
    -- ECG
    ecg_result VARCHAR(50),                       -- 'normal', 'abnormal'
    ecg_file_path TEXT,                           -- Path to ECG PDF
    
    -- Stethoscope
    heart_sound VARCHAR(50),
    lung_sound VARCHAR(50),
    
    measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_id VARCHAR(50),                        -- Device identifier
    notes TEXT,
    
    FOREIGN KEY (visit_id) REFERENCES clinical_visit(visit_id),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE INDEX idx_vitals_patient ON vitals(patient_id);
CREATE INDEX idx_vitals_visit ON vitals(visit_id);
```

---

### **4. uploads** (File Uploads)
Medical reports and documents uploaded by patients.

```sql
CREATE TABLE uploads (
    upload_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    filename VARCHAR(255) NOT NULL,               -- Stored filename (UUID-based)
    original_filename VARCHAR(255),               -- Original user filename
    file_path TEXT NOT NULL,                      -- Full file path
    file_size INTEGER,                            -- Bytes
    file_type VARCHAR(50),                        -- MIME type
    report_type VARCHAR(50),                      -- 'lh_fsh', 'hemoglobin', 'lipid', etc.
    description TEXT,                             -- User description
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE INDEX idx_uploads_patient ON uploads(patient_id);
CREATE INDEX idx_uploads_type ON uploads(report_type);
```

**Allowed File Types:**
- PDF: `.pdf`
- Images: `.jpg`, `.jpeg`, `.png`
- Documents: `.doc`, `.docx`
- Max Size: 10MB

---

### **5. reports** (Legacy - may be deprecated)
Health assessment reports (older structure).

```sql
CREATE TABLE reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    awis_score REAL,                              -- Aaha Wellness Index Score (0-100)
    risk_level VARCHAR(20),                       -- 'low', 'moderate', 'high'
    prediction TEXT,                              -- JSON: conditions, recommendations
    report_data TEXT,                             -- JSON: detailed data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE INDEX idx_reports_patient ON reports(patient_id);
```

---

### **6. risk_factor** (Risk Assessment)
Individual risk factors identified during screening.

```sql
CREATE TABLE risk_factor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER,
    patient_id VARCHAR(20) NOT NULL,
    risk_type VARCHAR(50),                        -- 'hypertension', 'diabetes', 'anemia'
    severity VARCHAR(20),                         -- 'mild', 'moderate', 'severe'
    identified_date DATE,
    notes TEXT,
    
    FOREIGN KEY (visit_id) REFERENCES clinical_visit(visit_id),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);
```

---

### **7. user** (CHW/Admin Users)
Community Health Workers and administrators.

```sql
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,          -- Bcrypt hash
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'chw',               -- 'admin', 'chw', 'supervisor'
    asha_worker_id VARCHAR(50) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    preferred_language VARCHAR(20) DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_asha ON user(asha_worker_id);
```

---

### **8. consent** (Patient Consent Records)
GDPR/compliance consent tracking.

```sql
CREATE TABLE consent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    consent_type VARCHAR(50),                     -- 'data_collection', 'data_sharing'
    consent_given BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP,
    consent_text TEXT,
    
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);
```

---

### **9. workflow_output** (Ambika AI Output)
Structured output from Ambika adaptive conversations.

```sql
CREATE TABLE workflow_output (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER,
    patient_id VARCHAR(20) NOT NULL,
    workflow_type VARCHAR(50),
    output_data TEXT,                             -- JSON: structured conversation output
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (visit_id) REFERENCES clinical_visit(visit_id),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);
```

---

### **10. chw_archive** (Archived CHW Records)
Historical records of CHW assignments and activities.

```sql
CREATE TABLE chw_archive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chw_id VARCHAR(50),
    action_type VARCHAR(50),
    action_data TEXT,                             -- JSON
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🌐 Backend API Documentation

### **Base URL**
```
Development: http://localhost:5001
Production: https://your-backend.onrender.com
```

### **Authentication**
All protected endpoints require Bearer token authentication:

```http
Authorization: Bearer <firebase_id_token>
```

**Token Types:**
1. **Firebase ID Token** (Production): Real Firebase authentication token
2. **Demo Token** (Development): `demo_token_{uid}_{timestamp}`

---

## 📡 API Endpoints

### **1. Authentication & Patient Management**

#### `POST /api/v2/patients`
Create new patient profile.

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "mobile_number": "+917777777777",
  "full_name": "Sanjay Thakor",
  "age": 25,
  "gender": "Male"
}
```

**Response (201):**
```json
{
  "message": "Patient created successfully",
  "patient": {
    "patient_id": "P4981826100",
    "firebase_uid": "abc123xyz",
    "full_name": "Sanjay Thakor",
    "age": 25,
    "gender": "Male",
    "phone_number": "+917777777777",
    "created_at": "2026-09-16T04:58:04"
  }
}
```

**Error (400):**
```json
{
  "error": "Patient already exists",
  "patient_id": "P4981826100"
}
```

---

#### `GET /api/v2/patients/me`
Get logged-in user's patient profile.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "patient": {
    "patient_id": "P4981826100",
    "firebase_uid": "abc123xyz",
    "full_name": "Sanjay Thakor",
    "age": 25,
    "gender": "Male",
    "phone_number": "+917777777777",
    "created_at": "2026-09-16T04:58:04"
  }
}
```

**Error (404):**
```json
{
  "error": "Patient profile not found"
}
```

---

#### `POST /api/v2/patients/link-by-phone`
Link Firebase UID to existing patient by phone number.

**Use Case:** When a patient created in Kiosk app logs into Consumer app for the first time.

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone_number": "+917777777777"
}
```

**Response (200):**
```json
{
  "message": "Patient linked successfully",
  "patient": {
    "patient_id": "P4981826100",
    "firebase_uid": "abc123xyz",
    "full_name": "Sanjay Thakor",
    "phone_number": "+917777777777"
  }
}
```

**Error (404):**
```json
{
  "error": "Patient not found with this phone number"
}
```

---

### **2. Reports & Health Data**

#### `GET /api/v2/reports/me`
Get all health reports for logged-in user.

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `analysed` (optional): `true` - Filter for analyzed reports only
- `limit` (optional): `3` - Limit number of results

**Response (200):**
```json
{
  "reports": [
    {
      "report_id": 123,
      "patient_id": "P4981826100",
      "awis_score": 85.5,
      "prediction": {
        "risk_level": "low",
        "conditions": ["healthy"],
        "recommendations": ["Maintain regular exercise"]
      },
      "report_data": {
        "blood_pressure": "118/76",
        "heart_rate": 72,
        "weight": 65,
        "height": 170,
        "bmi": 22.5,
        "spo2": 98
      },
      "created_at": "2026-09-16T10:30:00"
    }
  ]
}
```

---

#### `GET /api/v2/assessments/me`
Get health assessments.

**Response (200):**
```json
{
  "assessments": []
}
```

---

#### `GET /api/v2/appointments/me`
Get scheduled appointments.

**Response (200):**
```json
{
  "appointments": []
}
```

---

#### `GET /api/v2/notifications/me`
Get user notifications.

**Response (200):**
```json
{
  "notifications": []
}
```

---

### **3. File Upload APIs**

#### `POST /api/v2/reports/upload`
Upload medical report file (images/PDFs).

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
file: <File>                  (required) - Image or PDF file
report_type: "lh_fsh"        (optional) - Type of report
description: "Blood test"    (optional) - Description
```

**Response (201):**
```json
{
  "message": "File uploaded successfully",
  "upload": {
    "upload_id": 1,
    "patient_id": "P4981826100",
    "filename": "abc123_20260916_103000.pdf",
    "original_filename": "my_report.pdf",
    "file_path": "/uploads/abc123_20260916_103000.pdf",
    "file_size": 123456,
    "file_type": "application/pdf",
    "report_type": "lh_fsh",
    "description": "Blood test results",
    "uploaded_at": "2026-09-16T10:30:00"
  }
}
```

**Errors:**
```json
// No file
{
  "error": "No file provided"
}

// Invalid type
{
  "error": "File type not allowed. Only PDF, JPG, PNG, DOC, DOCX are allowed"
}

// Too large
{
  "error": "File size exceeds 10MB limit"
}
```

---

#### `POST /api/v2/uploads/upload`
Alternative upload endpoint (same as above).

---

#### `GET /api/v2/uploads/my-uploads`
Get all uploaded files for logged-in user.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "uploads": [
    {
      "upload_id": 1,
      "patient_id": "P4981826100",
      "filename": "abc123_20260916_103000.pdf",
      "original_filename": "my_report.pdf",
      "file_size": 123456,
      "file_type": "application/pdf",
      "report_type": "lh_fsh",
      "description": "Blood test results",
      "uploaded_at": "2026-09-16T10:30:00"
    }
  ]
}
```

---

#### `DELETE /api/v2/uploads/:upload_id`
Delete an uploaded file.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

**Error (404):**
```json
{
  "error": "Upload not found or access denied"
}
```

---

#### `GET /api/v2/uploads/download/:upload_id`
Download an uploaded file.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** File download

---

### **4. Kiosk/Ambika APIs**

#### `POST /api/ambika/session/start`
Start Ambika adaptive conversation session.

**Request Body:**
```json
{
  "patient_id": "KIOSK-1789533620349",
  "language_code": "hi-IN",
  "age": 25
}
```

**Response:**
```json
{
  "session_id": "KIOSK-1789533620349",
  "state": {
    "phase": "intake",
    "question": "नमस्ते! मैं आपकी स्वास्थ्य जांच में मदद करूंगी। आपका नाम क्या है?"
  },
  "message": "नमस्ते! मैं आपकी स्वास्थ्य जांच में मदद करूंगी। आपका नाम क्या है?",
  "success": true
}
```

---

#### `POST /api/ambika/record-answer`
Submit answer to Ambika question.

**Request Body:**
```json
{
  "patient_id": "KIOSK-1789533620349",
  "answer": "मेरा नाम संजय है"
}
```

**Response:**
```json
{
  "success": true,
  "message": "धन्यवाद संजय जी। आपकी उम्र क्या है?",
  "next_action": "continue",
  "status": "question",
  "next_question": {
    "question": "धन्यवाद संजय जी। आपकी उम्र क्या है?",
    "options": null,
    "phase": "intake",
    "is_complete": false
  }
}
```

---

#### `POST /api/ambika/next-question`
Get next question in conversation flow.

**Response:**
```json
{
  "question": "क्या आपको कोई बीमारी है?",
  "questionType": "options",
  "options": ["हाँ", "नहीं"],
  "is_complete": false,
  "phase": "medical_history",
  "status": "question",
  "success": true
}
```

---

#### `POST /api/kiosk/start`
Start kiosk session with auto-baseline device readings.

**Request Body:**
```json
{
  "patient_id": "KIOSK-1789533620349",
  "language_code": "hi-IN",
  "age": 25
}
```

**Response:**
```json
{
  "session_id": "KIOSK-1789533620349",
  "question": "नमस्ते! आज आप कैसा महसूस कर रहे हैं?",
  "status": "question",
  "phase": "intake",
  "options": ["अच्छा", "ठीक-ठाक", "बुरा"],
  "success": true
}
```

---

### **5. Device Integration APIs**

#### `GET /api/devices/status`
Check medical device gateway status.

**Response:**
```json
{
  "status": "ok",
  "gateway_status": "online",
  "devices": {
    "bp": {
      "status": "available",
      "name": "BP"
    },
    "spo2": {
      "status": "available",
      "name": "SPO2"
    },
    "ecg": {
      "status": "available",
      "name": "ECG"
    },
    "weight": {
      "status": "available",
      "name": "WEIGHT"
    }
  },
  "demo_mode": false
}
```

---

#### `POST /api/devices/trigger/:device_id`
Trigger a device measurement.

**Supported Devices:**
- `bp` - Blood Pressure Monitor
- `spo2` - Pulse Oximeter
- `ecg` - ECG Machine
- `weight` - Weighing Scale
- `hemoglobin` - Hemoglobin Meter
- `glucose` - Glucometer
- `stethoscope` - Digital Stethoscope

**Request Body:**
```json
{
  "patient_id": "KIOSK-1789533620349"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "device_id": "bp",
    "readings": {
      "systolic": 118,
      "diastolic": 76,
      "pulse": 72,
      "flag": "green"
    }
  },
  "source": "device"
}
```

**Response (Demo Mode):**
```json
{
  "success": false,
  "error": "Gateway offline",
  "fallback": "demo_mode"
}
```

---

### **6. Voice & TTS/STT APIs**

#### `POST /api/tts`
Text-to-Speech conversion.

**Request Body:**
```json
{
  "text": "नमस्ते, आज आपकी तबीयत कैसी है?",
  "language_code": "hi-IN"
}
```

**Response:**
```json
{
  "audio_base64": "//uQxAAAAAAA...(base64 encoded audio)",
  "success": true
}
```

---

#### `POST /api/stt`
Speech-to-Text conversion.

**Headers:**
```http
Content-Type: multipart/form-data
```

**Form Data:**
```
audio: <File>                  (Audio file - WAV/MP3)
language_code: "hi-IN"        (Language code)
```

**Response:**
```json
{
  "transcript": "मुझे सिरदर्द है",
  "confidence": 0.95,
  "success": true
}
```

---

### **7. OCR & Report Extraction**

#### `POST /api/extract-report`
Extract data from medical report image using Gemini Vision.

**Headers:**
```http
Content-Type: multipart/form-data
```

**Form Data:**
```
image: <File>                  (Image file - JPG/PNG)
test_type: "hemoglobin"       (Type of test)
```

**Supported Test Types:**
- `hemoglobin` / `hb` / `haemoglobin`
- `tsh` - Thyroid
- `hba1c` - Diabetes
- `lipid` - Cholesterol
- `glucose` - Blood Sugar
- `ferritin` - Iron levels

**Response (Success):**
```json
{
  "success": true,
  "value": "12.5",
  "unit": "g/dL"
}
```

**Response (Manual Entry Needed):**
```json
{
  "success": false,
  "error": "Could not extract",
  "manual_entry_needed": true
}
```

---

### **8. Health Check & Admin**

#### `GET /api/v2/health`
Check backend and database health.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "database_name": "aaha",
  "database_user": "postgres"
}
```

---

#### `GET /api/health`
Alternative health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "engine": "Ambika Adaptive v1",
  "timestamp": "2026-09-16T10:30:00"
}
```

---

## 🎨 Frontend Features

### **Consumer App Pages**

#### 1. **Login/Signup (`/login`)**
- Firebase phone OTP authentication
- Demo mode for testing
- Automatic patient profile creation
- Auto-linking with kiosk data by phone number

**Demo Credentials:**
```
Phone: 7777777777
OTP: Any 6 digits (demo mode)
```

---

#### 2. **Welcome Page (`/welcome`)**
- Onboarding introduction
- Feature overview
- Language selection
- Quick start guide

---

#### 3. **Home Dashboard (`/home`)**
- Patient profile summary
- Recent health metrics
- AWIS score display
- Quick action buttons
- Latest screening results

**Displayed Data:**
- Name, Age, Gender
- Last screening date
- AWIS score trend
- Active health alerts

---

#### 4. **Upload Reports (`/upload`)**
- Multi-file upload support
- Drag & drop interface
- OCR processing with Gemini Vision
- Real-time extraction feedback
- Manual data entry fallback

**Supported Formats:**
- Images: JPG, PNG
- Documents: PDF
- Max size: 10MB per file

**Report Types:**
- LH/FSH (Hormones)
- Hemoglobin
- TSH (Thyroid)
- HbA1c (Diabetes)
- Lipid Profile
- Blood Glucose
- Ferritin

---

#### 5. **Reports History (`/reports`)**
- Chronological report list
- Filter by report type
- Search functionality
- View/download reports
- Delete uploaded reports

---

#### 6. **Profile (`/profile`)**
- View/edit personal information
- Update phone number
- Change language preference
- Logout option

---

#### 7. **AAHA Integration (`/aaha`)**
- Information about AAHA program
- Community health resources
- CHW locator
- Health education content

---

#### 8. **Language Selection (`/language`)**
- Multi-language support
- Real-time language switching
- Persisted preference

**Supported Languages:**
- English
- Hindi (हिन्दी)
- Marathi (मराठी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Bengali (বাংলা)

---

### **Kiosk App Pages**

#### 1. **CHW Login (`/auth/login`)**
- Email/password authentication
- Role-based access control
- Session management

---

#### 2. **CHW Dashboard (`/dashboard`)**
- Today's screening count
- Pending follow-ups
- Risk alert patients
- Quick patient search

---

#### 3. **Patient Management (`/patients`)**
- Patient list
- Search and filter
- Create new patient
- View patient history

---

#### 4. **Kiosk Screening (`/kiosk-chat`)**
- Ambika adaptive conversation
- Voice input/output
- Real-time translation
- Device integration
- Auto-baseline vitals capture

**Workflow:**
1. Patient registration
2. Baseline vitals (auto)
3. Adaptive questioning (Ambika AI)
4. Targeted device readings
5. Risk assessment
6. Report generation

---

#### 5. **Admin Panel (`/kiosk-admin`)**
- User management
- System configuration
- Data export
- Analytics dashboard

---

## 🔐 Authentication Flow

### **Consumer App (Firebase)**

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Firebase
    participant Backend
    participant Database

    User->>Frontend: Enter phone number
    Frontend->>Firebase: Send OTP request
    Firebase->>User: SMS with OTP
    User->>Frontend: Enter OTP
    Frontend->>Firebase: Verify OTP
    Firebase->>Frontend: ID Token
    Frontend->>Backend: GET /api/v2/patients/me (with token)
    
    alt Patient exists
        Backend->>Database: Query by firebase_uid
        Database->>Backend: Patient data
        Backend->>Frontend: 200 OK with patient
    else Patient not found by UID
        Backend->>Database: Query by phone_number
        alt Found by phone
            Database->>Backend: Patient data
            Backend->>Database: UPDATE firebase_uid
            Backend->>Frontend: 200 OK (linked)
        else Not found
            Frontend->>Backend: POST /api/v2/patients (create)
            Backend->>Database: INSERT patient
            Backend->>Frontend: 201 Created
        end
    end
    
    Frontend->>User: Show dashboard
```

### **Demo Mode Flow**

```javascript
// Generate demo token
const mockFirebaseUID = `demo_${phoneNumber}`;
const mockToken = `demo_token_${mockFirebaseUID}_${Date.now()}`;

// Store in localStorage
localStorage.setItem("aaha_demo_session", JSON.stringify({
  uid: mockFirebaseUID,
  phoneNumber: formattedPhone,
  token: mockToken,
  timestamp: Date.now()
}));

// Backend validates demo token
if (token.startsWith('demo_token_')) {
  // Extract UID from token
  const parts = token.split('_');
  const uid = parts.slice(2, -1).join('_');
  
  return {
    uid: uid,
    phoneNumber: '+917777777777',
    demo: true
  };
}
```

---

### **Kiosk App (Flask-Login)**

```python
# Login
user = User.query.filter_by(email=email).first()
if user and user.check_password(password):
    login_user(user)
    return redirect('/dashboard')

# Protected route
@app.route('/dashboard')
@login_required
def dashboard():
    # current_user is available
    return render_template('dashboard.html')
```

---

## 📤 File Upload System

### **Upload Flow**

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant FileSystem
    participant GeminiVision
    participant Database

    User->>Frontend: Select file (image/PDF)
    Frontend->>Frontend: Validate file (type, size)
    
    alt File is image & OCR enabled
        Frontend->>GeminiVision: Extract data
        GeminiVision->>Frontend: Extracted values
        Frontend->>User: Show extracted data
    end
    
    User->>Frontend: Confirm upload
    Frontend->>Backend: POST /api/v2/reports/upload
    Backend->>Backend: Validate token
    Backend->>Backend: Generate UUID filename
    Backend->>FileSystem: Save file
    FileSystem->>Backend: File path
    Backend->>Database: INSERT upload record
    Database->>Backend: Upload ID
    Backend->>Frontend: 201 Created
    Frontend->>User: Success message
```

### **File Naming Convention**

```python
# Generate unique filename
import uuid
from datetime import datetime

file_extension = get_file_extension(original_filename)
unique_filename = f"{uuid.uuid4().hex}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{file_extension}"

# Example: abc123def456_20260916_103000.pdf
```

### **Storage Locations**

**Development:**
```
PROJECT_ROOT/
└── uploads/
    ├── abc123_20260916_103000.pdf
    ├── def456_20260916_103500.jpg
    └── ...
```

**Production (GCS):**
```
gs://aaha-uploads/
└── patients/
    └── P4981826100/
        ├── abc123_20260916_103000.pdf
        ├── def456_20260916_103500.jpg
        └── ...
```

---

## 🔄 Data Sync Between Apps

### **Problem Statement**
Patients created in **Kiosk App** (by CHW) need to access their data in **Consumer App** (via phone login).

### **Solution: Firebase UID Linking**

**Scenario 1: Kiosk → Consumer**
```
1. CHW creates patient in Kiosk:
   - patient_id: "KIOSK-1789533620349"
   - phone_number: "+917777777777"
   - firebase_uid: NULL

2. Patient logs into Consumer App with same phone:
   - Firebase Auth generates UID: "abc123xyz"
   - Backend checks firebase_uid → not found
   - Backend searches by phone_number → found!
   - Backend updates: firebase_uid = "abc123xyz"
   - Patient can now access Kiosk data in Consumer App ✓
```

**Scenario 2: Consumer → Kiosk**
```
1. Patient signs up in Consumer App:
   - Creates patient with firebase_uid
   - phone_number: "+917777777777"

2. CHW searches patient in Kiosk by phone:
   - Finds existing patient
   - Can view/update Consumer App data ✓
```

### **Auto-Linking Implementation**

**Frontend (login.tsx):**
```typescript
try {
  // Try to get profile by Firebase UID
  const profile = await apiService.getMyProfile();
  console.log("✅ Patient exists");
} catch (error) {
  // Try to link by phone number
  try {
    const linkResponse = await apiService.linkPatientByPhone(phoneNumber);
    console.log("✅ Linked existing patient");
    toast.success("Account linked!", {
      description: "Your kiosk data is now synced"
    });
  } catch (linkError) {
    // Create new patient
    await apiService.createPatient({ ... });
  }
}
```

**Backend (frontend_api.py):**
```python
@frontend_api.route('/api/v2/patients/link-by-phone', methods=['POST'])
@token_required
def link_patient_by_phone_v2(current_user):
    phone_number = request.json.get('phone_number')
    firebase_uid = current_user.get('uid')
    
    # Find patient by phone
    patient = Patient.query.filter_by(phone_number=phone_number).first()
    
    if patient:
        # Update Firebase UID
        patient.firebase_uid = firebase_uid
        db.session.commit()
        return jsonify({'message': 'Patient linked successfully'})
    
    return jsonify({'error': 'Patient not found'}), 404
```

---

## ⚙️ Environment Configuration

### **Frontend (.env)**

```bash
# Backend API
VITE_API_BASE_URL=http://localhost:5001/api/v2

# Firebase Configuration (Get from your Firebase Console)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

### **Backend (.env)**

```bash
# Flask Configuration
SECRET_KEY=your_secret_key_here
FLASK_ENV=development

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password_here
ADMIN_PHONE=0000000000

# Database Configuration
# SQLite (Development)
DATABASE_URL=sqlite:///path/to/database/aaha.db

# PostgreSQL (Production)
# DATABASE_URL=postgresql://user:password@localhost:5432/aaha

# Google Cloud Storage (Optional)
GCS_BUCKET_NAME=

# Gemini AI API Key
GEMINI_API_KEY=

# Translation Configuration
TRANSLATION_TIMEOUT=5000
TRANSLATION_MAX_LENGTH_RATIO=2.0

# Workflow Studio Integration (Optional)
WORKFLOW_STUDIO_URL=
STUDIO_REGISTRATION_TOKEN=
APP_PUBLIC_URL=
STUDIO_API_KEY=

# CORS Origins (Production)
FLASK_CORS_ORIGINS=https://your-frontend.onrender.com,https://custom-domain.com
```

---

## 🚀 Deployment Guide

### **Backend Deployment (Render)**

**1. Create Web Service:**
- Repository: `CHWapp-main`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn run:app`

**2. Add PostgreSQL Database:**
- Create PostgreSQL service
- Link to backend service
- `DATABASE_URL` auto-injected

**3. Environment Variables:**
```bash
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
FLASK_ENV=production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong-password>
GEMINI_API_KEY=<your-gemini-key>
FLASK_CORS_ORIGINS=https://your-frontend.onrender.com
```

**4. Database Migration:**
```bash
# After deployment, run once:
flask db upgrade
```

---

### **Frontend Deployment (Render)**

**1. Create Static Site:**
- Repository: `health-pulse-fix-main`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

**2. Environment Variables:**
```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api/v2
VITE_FIREBASE_API_KEY=<firebase-key>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>
```

**3. Update Backend CORS:**
After frontend deploys, add its URL to backend `FLASK_CORS_ORIGINS`.

---

### **Firebase Deployment (Optional)**

```bash
# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

---

## 💻 Development Setup

### **Prerequisites**
```bash
# Required
- Python 3.10+
- Node.js 18+
- npm or yarn
- Git

# Optional
- PostgreSQL (for production-like testing)
- Firebase CLI
```

---

### **Backend Setup**

```bash
# 1. Clone repository
cd CHWapp-main

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux

# 5. Initialize database
flask db upgrade

# 6. Create admin user (auto-created on first run)
python run.py

# 7. Run development server
python run.py
# Server: http://localhost:5001
```

---

### **Frontend Setup**

```bash
# 1. Navigate to frontend
cd health-pulse-fix-main

# 2. Install dependencies
npm install

# 3. Create .env file
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux

# 4. Run development server
npm run dev
# Server: http://localhost:3000
```

---

### **Database Utilities**

```bash
# Check patient data
cd CHWapp-main
python check_patient.py

# Check all tables
python check_tables.py

# Fix gender enum values
python fix_gender.py

# Create uploads table
python create_uploads_table.py
```

---

## 📊 API Response Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Valid request but business logic error |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | External service (device gateway) offline |

---

## 🔧 Common Issues & Solutions

### **1. CORS Errors**
```javascript
// Error: Access to fetch blocked by CORS policy

// Solution: Add frontend URL to backend CORS
// Backend: app/__init__.py
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",  // Add this
            "https://your-frontend.onrender.com"
        ]
    }
})
```

---

### **2. OPTIONS 401 Errors**
```python
# Error: OPTIONS request returns 401

# Solution: Handle OPTIONS in auth decorator
# Backend: app/utils/auth.py
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Skip auth for OPTIONS
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
        # ... rest of auth logic
```

---

### **3. Gender Enum Error**
```sql
-- Error: 'male' is not among defined enum values

-- Solution: Update database values
UPDATE patient SET gender = 'Male' WHERE LOWER(gender) = 'male';
UPDATE patient SET gender = 'Female' WHERE LOWER(gender) = 'female';
UPDATE patient SET gender = 'Other' WHERE gender IS NULL OR LOWER(gender) = 'other';
```

---

### **4. Upload Table Missing**
```python
# Error: no such table: uploads

# Solution: Run migration script
python create_uploads_table.py

# Or use Flask-Migrate
flask db upgrade
```

---

### **5. Patient Data Not Syncing**
```python
# Issue: Kiosk patient not visible in Consumer app

# Solution 1: Link by phone number
POST /api/v2/patients/link-by-phone
{
  "phone_number": "+917777777777"
}

# Solution 2: Check if phone numbers match exactly
# Kiosk uses: "7777777777"
# Consumer uses: "+917777777777"
# Need to normalize in backend
```

---

## 📚 Additional Resources

### **API Testing Tools**
- **Postman**: Use collection export (see `API_TESTS.postman_collection.json`)
- **cURL**: Command-line testing
- **Thunder Client**: VS Code extension

### **Sample cURL Commands**

```bash
# Get patient profile
curl -X GET "http://localhost:5001/api/v2/patients/me" \
  -H "Authorization: Bearer demo_token_demo_7777777777_1234567890"

# Upload file
curl -X POST "http://localhost:5001/api/v2/reports/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@report.pdf" \
  -F "report_type=hemoglobin" \
  -F "description=Blood test results"

# Create patient
curl -X POST "http://localhost:5001/api/v2/patients" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "+917777777777",
    "full_name": "Test User",
    "age": 25,
    "gender": "Male"
  }'
```

---

## 🎯 Next Steps for AI Integration

This documentation is ready for AI tools to:

1. **Generate API Clients**: Use API specs to generate TypeScript/Python clients
2. **Create Test Suites**: Auto-generate integration tests
3. **Build Frontend Components**: Generate React components based on API responses
4. **Database Migrations**: Create migration scripts from schema
5. **API Documentation**: Generate OpenAPI/Swagger specs
6. **Code Generation**: Create boilerplate for new features

### **Prompt Template for AI Tools:**

```
Using the Aaha Health Pulse documentation:
1. Database Schema: See "Database Schema" section
2. API Endpoints: See "Backend API Documentation" section
3. Authentication: See "Authentication Flow" section
4. Data Models: Infer from API responses

Task: [Your specific task here]
- Generate [component/API/test/etc.]
- Following [specific pattern/standard]
- With [additional requirements]
```

---

## 📞 Support & Contact

**Documentation Version**: 2.0  
**Last Updated**: September 16, 2026  
**Maintainer**: Development Team

For issues or questions:
- Check `TROUBLESHOOTING.md`
- Review API error responses
- Check backend logs
- Verify environment variables

---

**End of Documentation** 🎉

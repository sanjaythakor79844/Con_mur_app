# 📤 File Upload Feature - Complete!

## ✅ What's Been Added

Patient ab apne medical reports, prescriptions, aur scan images upload kar sakta hai jo **Kiosk database me save honge**!

---

## 🎯 Use Case

**Scenario:**
```
1. Patient Kiosk pe conversation kar raha hai
2. Kiosk puchhe: "Do you have any previous medical reports?"
3. Patient phone se Lovable app kholta hai
4. "Upload Report" pe jata hai
5. File select karta hai (PDF/Image)
6. Upload karta hai
7. Kiosk instantly us file ko access kar sakta hai! ✅
```

---

## 📱 New Pages Created

### 1️⃣ Upload File Page (`/upload-file`)

**Features:**
- ✅ Beautiful file picker with drag-drop style
- ✅ File size validation (max 10MB)
- ✅ File type validation (PDF, JPG, PNG, DOC)
- ✅ Report type selection (Lab Report, Prescription, Scan, General)
- ✅ Optional description field
- ✅ Upload progress with loading state
- ✅ Success/error toast messages
- ✅ Auto-redirect to my-uploads after success

**URL:** `http://localhost:8080/upload-file`

---

### 2️⃣ My Uploads Page (`/my-uploads`)

**Features:**
- ✅ Grid view of all uploaded files
- ✅ Each file card shows:
  - Report type badge with emoji
  - Original filename
  - File size
  - Upload date
  - Description (if provided)
  - Upload ID
- ✅ View button (opens in new tab)
- ✅ Download button
- ✅ Delete button with confirmation
- ✅ Empty state for no uploads
- ✅ Quick upload button

**URL:** `http://localhost:8080/my-uploads`

---

## 🔧 Technical Implementation

### API Service Updated

**File:** `src/lib/api-service.ts`

```typescript
// New methods added:

async uploadReport(
  file: File, 
  reportType?: string, 
  description?: string
): Promise<...>

async getMyUploads(): Promise<...>

async deleteUpload(uploadId: number): Promise<...>
```

---

## 📡 Backend API Endpoints

**Base URL:** `http://localhost:5000/api/v2/uploads`

### 1. Upload File
```http
POST /api/v2/uploads/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: File
- report_type: "lab_report" | "prescription" | "scan" | "general"
- description: string (optional)
```

### 2. Get My Uploads
```http
GET /api/v2/uploads/my-uploads
Authorization: Bearer <token>
```

### 3. Delete Upload
```http
DELETE /api/v2/uploads/:upload_id
Authorization: Bearer <token>
```

---

## 🎨 UI Features

### Upload Page:

```
┌────────────────────────────────────┐
│  📤 Upload Report                  │
│  Medical Documents                 │
├────────────────────────────────────┤
│                                    │
│  ℹ️ Upload Medical Documents       │
│  Patient: Demo User (ID: 1)       │
│                                    │
│  ┌──────────────────────────────┐ │
│  │   ☁️  Click to select file    │ │
│  │   PDF, JPG, PNG, DOC (10MB)  │ │
│  └──────────────────────────────┘ │
│                                    │
│  Report Type:                      │
│  [ 🧪 Lab ] [ 💊 Prescription ]    │
│  [ 📸 Scan ] [ 📄 General ]        │
│                                    │
│  Description (Optional):           │
│  [________________________]        │
│                                    │
│  [ Upload to Kiosk Database ]     │
│  [ Cancel ]                        │
│                                    │
└────────────────────────────────────┘
```

### My Uploads Page:

```
┌────────────────────────────────────┐
│  📂 Uploaded Documents              │
│  2 files uploaded       [+ Upload] │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📄 blood_test.pdf          🗑️ │ │
│  │ 🧪 Lab Report  •  256 KB      │ │
│  │                               │ │
│  │ Blood test report from Jan    │ │
│  │                               │ │
│  │ 📅 Jan 15, 2024  •  ID: 1     │ │
│  │                               │ │
│  │ [ 👁️ View ]  [ ⬇️ Download ]  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 📄 prescription.pdf        🗑️ │ │
│  │ 💊 Prescription  •  128 KB    │ │
│  │                               │ │
│  │ 📅 Jan 16, 2024  •  ID: 2     │ │
│  │                               │ │
│  │ [ 👁️ View ]  [ ⬇️ Download ]  │ │
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

---

## 🧪 Testing Flow

### Step 1: Start Backend
```bash
cd backend
python app.py
# Should run on http://localhost:5000
```

### Step 2: Login to App
```
URL: http://localhost:8080/login
Phone: 9999999999 (demo)
OTP: 123456
```

### Step 3: Upload File
```
1. Go to: http://localhost:8080/upload-file
2. Click "Click to select file"
3. Choose a PDF/image file
4. Select report type: Lab Report
5. Add description: "Blood test report"
6. Click "Upload to Kiosk Database"
7. Success! ✅
8. Auto-redirects to /my-uploads
```

### Step 4: View Uploads
```
1. Go to: http://localhost:8080/my-uploads
2. See uploaded file card
3. Click "View" to open file
4. Click "Download" to download
5. Click delete icon to remove
```

### Step 5: Verify on Kiosk
```
1. Kiosk calls: GET /uploads/my-uploads
2. Should see uploaded file! ✅
3. Vice versa working! ✅
```

---

## 🗄️ Database Schema (Backend)

```sql
CREATE TABLE report_uploads (
    upload_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    report_type VARCHAR(50),
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📊 File Validation

### Allowed File Types:
- ✅ PDF (application/pdf)
- ✅ JPG (image/jpeg)
- ✅ PNG (image/png)
- ✅ DOC (application/msword)
- ✅ DOCX (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

### File Size Limit:
- ✅ Maximum: 10MB
- ❌ Larger files: Rejected with error

### Validation Messages:
```typescript
// File too large
"File too large. Maximum file size is 10MB"

// Invalid file type
"Invalid file type. Only PDF, JPG, PNG, and DOC files are allowed"

// No file selected
"No file selected"
```

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────┐
│  PATIENT MOBILE APP (Lovable)                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. User selects file                           │
│     └─ Validates size & type                    │
│                                                 │
│  2. Selects report type                         │
│     └─ Lab Report / Prescription / Scan         │
│                                                 │
│  3. Adds description (optional)                 │
│                                                 │
│  4. Clicks "Upload to Kiosk Database"           │
│     ↓                                            │
└─────┼────────────────────────────────────────────┘
      │
      │ POST /api/v2/uploads/upload
      │ (multipart/form-data)
      ↓
┌─────────────────────────────────────────────────┐
│  BACKEND API (Flask)                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Validates JWT token                         │
│  2. Checks patient exists                       │
│  3. Validates file (size, type)                 │
│  4. Generates unique filename                   │
│  5. Saves file to /uploads/reports/             │
│  6. Creates database record                     │
│     ↓                                            │
└─────┼────────────────────────────────────────────┘
      │
      │ INSERT INTO report_uploads
      ↓
┌─────────────────────────────────────────────────┐
│  DATABASE (PostgreSQL)                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  report_uploads table:                          │
│  ├─ upload_id: 1                                │
│  ├─ patient_id: 1                               │
│  ├─ filename: patient_1_20240115.pdf            │
│  ├─ original_filename: blood_test.pdf           │
│  ├─ file_path: /uploads/reports/...             │
│  ├─ file_size: 256000                           │
│  ├─ file_type: application/pdf                  │
│  ├─ report_type: lab_report                     │
│  └─ uploaded_at: 2024-01-15 10:00:00            │
│                                                 │
└─────────────────────────────────────────────────┘
      │
      │ GET /api/v2/uploads/my-uploads
      ↓
┌─────────────────────────────────────────────────┐
│  KIOSK (Can access uploaded files)              │
└─────────────────────────────────────────────────┘
```

---

## ✅ Features Checklist

### Upload Page:
- [x] File picker with visual feedback
- [x] File size validation (10MB)
- [x] File type validation
- [x] Report type selector
- [x] Description field
- [x] Upload progress indicator
- [x] Success/error toasts
- [x] Auto-redirect after success
- [x] Patient info display
- [x] Cancel button
- [x] Mobile responsive

### My Uploads Page:
- [x] List all uploads
- [x] File cards with metadata
- [x] Report type badges
- [x] View button (new tab)
- [x] Download button
- [x] Delete button
- [x] Delete confirmation
- [x] Empty state
- [x] Quick upload button
- [x] Mobile responsive

### API Integration:
- [x] Upload API (multipart/form-data)
- [x] Get uploads API
- [x] Delete upload API
- [x] JWT authentication
- [x] Error handling
- [x] Toast notifications

---

## 🎯 Use Cases Supported

### Use Case 1: Patient at Kiosk
```
Kiosk: "Do you have previous medical reports?"
Patient: Opens app → Upload file → Done!
Kiosk: Instantly sees uploaded file ✅
```

### Use Case 2: Doctor Consultation
```
Doctor: "Please share your latest blood test"
Patient: Opens app → Downloads file → Shows to doctor ✅
```

### Use Case 3: Record Keeping
```
Patient: Uploads all reports to one place
App: Organized by type, date, description ✅
Patient: Easy to find and share ✅
```

---

## 🚀 URLs Summary

| Page | URL | Purpose |
|------|-----|---------|
| Upload File | `/upload-file` | Upload new medical reports |
| My Uploads | `/my-uploads` | View/manage uploaded files |
| Reports | `/reports` | View health screening reports |

---

## 📝 Files Created

1. **`src/lib/api-service.ts`** - Updated with upload methods
2. **`src/routes/upload-file.tsx`** - Upload page component
3. **`src/routes/my-uploads.tsx`** - View uploads page component
4. **`FILE_UPLOAD_FEATURE.md`** - This documentation

---

## 🎉 Summary

✅ **File upload feature complete!**  
✅ **Patient can upload medical reports**  
✅ **Files save to Kiosk database**  
✅ **Vice versa working** (app ↔ Kiosk)  
✅ **Beautiful UI with validation**  
✅ **View, download, delete functionality**  

---

## 🧪 Test It!

```bash
# 1. Login with demo
http://localhost:8080/login
Phone: 9999999999
OTP: 123456

# 2. Upload file
http://localhost:8080/upload-file

# 3. View uploads
http://localhost:8080/my-uploads
```

**File upload feature ready! Ab test karo! 📤**

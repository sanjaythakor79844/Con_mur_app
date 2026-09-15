# Backend Upload Endpoints Setup Guide

## 📍 Flask Backend Location
**Path:** `D:\Vinay\aaha-kiosk-main\CHWapp-main`

## 🎯 Required Endpoints

Add these endpoints to your Flask backend to enable report uploads from consumer app to Kiosk database.

---

## 1. Database Schema

### Create `report_uploads` table in PostgreSQL (DB_AHHA):

```sql
CREATE TABLE IF NOT EXISTS report_uploads (
    upload_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'consumer_app',
    
    INDEX idx_patient_uploads (patient_id),
    INDEX idx_report_type (report_type),
    INDEX idx_uploaded_at (uploaded_at)
);
```

### Report Types (8 types):
- `lh_fsh` - LH/FSH Ratio
- `testosterone` - Testosterone
- `tsh` - TSH (Thyroid)
- `ferritin` - Ferritin (Iron)
- `prolactin` - Prolactin
- `urine` - Urine Protein
- `pregnancy_test` - Pregnancy Test
- `general` - General Report

---

## 2. Create Upload Routes File

### File: `app/routes/uploads.py`

```python
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from app.extensions import db
from app.models.patient import Patient
from functools import wraps

uploads_bp = Blueprint('uploads', __name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_patient_from_token(f):
    """Decorator to get patient from Firebase token or demo session"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get patient_id from header or body
        patient_id = request.headers.get('X-Patient-ID') or request.form.get('patient_id')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID required'}), 401
        
        patient = Patient.query.filter_by(patient_id=patient_id).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        return f(patient, *args, **kwargs)
    return decorated_function


@uploads_bp.route('/upload', methods=['POST'])
@get_patient_from_token
def upload_report(patient):
    """Upload a medical report file"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: PDF, JPG, PNG, DOC'}), 400
        
        # Get form data
        report_type = request.form.get('report_type', 'general')
        description = request.form.get('description', '')
        
        # Secure filename
        original_filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{patient.patient_id}_{timestamp}_{original_filename}"
        
        # Create upload directory if not exists
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'reports')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        file_type = file.content_type or 'application/octet-stream'
        
        # Insert into database
        query = """
            INSERT INTO report_uploads 
            (patient_id, filename, original_filename, file_path, file_size, file_type, report_type, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING upload_id, uploaded_at
        """
        
        cursor = db.session.execute(
            query,
            (patient.patient_id, filename, original_filename, file_path, 
             file_size, file_type, report_type, description)
        )
        result = cursor.fetchone()
        db.session.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'upload': {
                'upload_id': result[0],
                'patient_id': patient.patient_id,
                'filename': filename,
                'original_filename': original_filename,
                'file_size': file_size,
                'file_type': file_type,
                'report_type': report_type,
                'description': description,
                'uploaded_at': result[1].isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Failed to upload file', 'details': str(e)}), 500


@uploads_bp.route('/my-uploads', methods=['GET'])
@get_patient_from_token
def get_my_uploads(patient):
    """Get all uploads for the authenticated patient"""
    try:
        query = """
            SELECT upload_id, filename, original_filename, file_path, 
                   file_size, file_type, report_type, description, uploaded_at
            FROM report_uploads
            WHERE patient_id = %s
            ORDER BY uploaded_at DESC
        """
        
        cursor = db.session.execute(query, (patient.patient_id,))
        uploads = cursor.fetchall()
        
        uploads_list = [{
            'upload_id': row[0],
            'filename': row[1],
            'original_filename': row[2],
            'file_path': row[3],
            'file_size': row[4],
            'file_type': row[5],
            'report_type': row[6],
            'description': row[7],
            'uploaded_at': row[8].isoformat() if row[8] else None
        } for row in uploads]
        
        return jsonify({
            'uploads': uploads_list,
            'count': len(uploads_list)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Fetch uploads error: {str(e)}")
        return jsonify({'error': 'Failed to fetch uploads', 'details': str(e)}), 500


@uploads_bp.route('/<int:upload_id>', methods=['DELETE'])
@get_patient_from_token
def delete_upload(patient, upload_id):
    """Delete an uploaded file"""
    try:
        # Get upload info
        query = "SELECT patient_id, file_path FROM report_uploads WHERE upload_id = %s"
        cursor = db.session.execute(query, (upload_id,))
        upload = cursor.fetchone()
        
        if not upload:
            return jsonify({'error': 'Upload not found'}), 404
        
        # Check ownership
        if upload[0] != patient.patient_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Delete file from disk
        file_path = upload[1]
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from database
        delete_query = "DELETE FROM report_uploads WHERE upload_id = %s"
        db.session.execute(delete_query, (upload_id,))
        db.session.commit()
        
        return jsonify({'message': 'Upload deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete upload error: {str(e)}")
        return jsonify({'error': 'Failed to delete upload', 'details': str(e)}), 500


@uploads_bp.route('/patient/<int:patient_id>', methods=['GET'])
def get_patient_uploads(patient_id):
    """Get uploads for a specific patient (for Kiosk conversion screen)"""
    try:
        query = """
            SELECT upload_id, filename, original_filename, file_path, 
                   file_size, file_type, report_type, description, uploaded_at
            FROM report_uploads
            WHERE patient_id = %s
            ORDER BY uploaded_at DESC
        """
        
        cursor = db.session.execute(query, (patient_id,))
        uploads = cursor.fetchall()
        
        uploads_list = [{
            'upload_id': row[0],
            'filename': row[1],
            'original_filename': row[2],
            'file_path': row[3],
            'file_size': row[4],
            'file_type': row[5],
            'report_type': row[6],
            'description': row[7],
            'uploaded_at': row[8].isoformat() if row[8] else None
        } for row in uploads]
        
        return jsonify({
            'patient_id': patient_id,
            'uploads': uploads_list,
            'count': len(uploads_list)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Fetch patient uploads error: {str(e)}")
        return jsonify({'error': 'Failed to fetch uploads', 'details': str(e)}), 500
```

---

## 3. Register Blueprint

### File: `app/__init__.py`

Add this import and registration:

```python
from app.routes.uploads import uploads_bp

def create_app():
    # ... existing code ...
    
    # Register blueprints
    app.register_blueprint(uploads_bp, url_prefix='/api/v2/uploads')
    
    # ... rest of code ...
    return app
```

---

## 4. Configure Upload Folder

### File: `app/config.py`

Add:

```python
class Config:
    # ... existing config ...
    
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max file size
```

---

## 5. Update Consumer App API Service

The consumer app is already configured to send requests with these headers:

```typescript
headers: {
  'X-Patient-ID': patient.patient_id.toString()
}
```

Your Flask backend should extract patient_id from this header.

---

## 6. Start Backend Server

```powershell
cd D:\Vinay\aaha-kiosk-main\CHWapp-main
python run.py
```

Server will start on: **http://localhost:5001**

---

## 7. API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v2/uploads/upload` | Upload report file (multipart/form-data) |
| GET | `/api/v2/uploads/my-uploads` | Get all uploads for authenticated patient |
| DELETE | `/api/v2/uploads/:upload_id` | Delete specific upload |
| GET | `/api/v2/uploads/patient/:patient_id` | Get uploads for patient (Kiosk use) |

---

## 8. Test Upload from Consumer App

1. Start Flask backend: `python run.py` (port 5001)
2. Consumer app already running on: http://localhost:8080
3. Login with demo: 9999999999 / OTP: 123456
4. Navigate to Upload page
5. Select file, report type, and upload
6. File will be saved to `D:\Vinay\aaha-kiosk-main\CHWapp-main\uploads\reports\`
7. Database entry created in `report_uploads` table

---

## 9. Kiosk Integration

### In Kiosk Conversion Screen:

```python
# Fetch patient uploads
import requests

patient_id = current_patient_id  # from session
response = requests.get(f'http://localhost:5001/api/v2/uploads/patient/{patient_id}')
uploads = response.json()['uploads']

# Display uploads in conversion screen
for upload in uploads:
    print(f"📄 {upload['original_filename']} ({upload['report_type']})")
    print(f"   Uploaded: {upload['uploaded_at']}")
    print(f"   File: {upload['file_path']}")
```

---

## ✅ Success Criteria

After setup:
- ✅ Consumer app can upload reports
- ✅ Files saved to `uploads/reports/` folder
- ✅ Database entries created
- ✅ Kiosk can fetch and display uploads
- ✅ Vice-versa data sharing working
- ✅ Both apps use same Firebase project (kiosk-e6b59)
- ✅ Both apps use same PostgreSQL database (DB_AHHA)

---

## 🔧 Troubleshooting

**Port 5001 already in use:**
```powershell
netstat -ano | findstr :5001
taskkill /PID <process_id> /F
```

**Database connection error:**
- Check `.env` file in backend folder
- Verify PostgreSQL is running
- Check DB_AHHA credentials

**CORS error:**
```python
# In app/__init__.py
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app, origins=['http://localhost:8080'])
    # ...
```

**File upload size error:**
- Check `MAX_CONTENT_LENGTH` in config
- Check nginx/proxy settings if using one

---

## 📝 Notes

- Consumer app port: **8080** (Vite dev server)
- Backend port: **5001** (Flask)
- Firebase project: **kiosk-e6b59** (shared)
- Database: **DB_AHHA** (PostgreSQL, shared)
- Upload folder: `CHWapp-main/uploads/reports/`
- Max file size: **10MB**
- Allowed types: **PDF, JPG, PNG, DOC**

---

**Created:** December 2024  
**Last Updated:** Now  
**Status:** Ready to implement

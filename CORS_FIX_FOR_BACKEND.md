# 🔧 CORS Fix for Flask Backend

## Problem
```
Access to fetch at 'http://localhost:5001/api/v2/patients/me' from origin 'http://localhost:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Solution

Add CORS support to Flask backend at: `D:\Vinay\aaha-kiosk-main\CHWapp-main`

---

## Step 1: Install flask-cors

```powershell
cd D:\Vinay\aaha-kiosk-main\CHWapp-main
pip install flask-cors
```

---

## Step 2: Update `app/__init__.py`

Find the `create_app()` function and add CORS configuration:

```python
from flask import Flask
from flask_cors import CORS  # ← ADD THIS LINE
from app.extensions import db
# ... other imports ...

def create_app():
    app = Flask(__name__)
    
    # Load config
    app.config.from_object('app.config.Config')
    
    # ✅ ADD CORS CONFIGURATION HERE (after config, before db.init_app)
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:8080",
                "http://127.0.0.1:8080",
                "http://10.205.201.225:8080"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Patient-ID"],
            "expose_headers": ["Content-Type"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })
    
    # Initialize extensions
    db.init_app(app)
    
    # ... rest of the code ...
    
    return app
```

---

## Step 3: Restart Flask Server

Stop the current Flask server (Ctrl+C in terminal) and restart:

```powershell
cd D:\Vinay\aaha-kiosk-main\CHWapp-main
py run.py
```

---

## Alternative: Simple CORS Setup (if above doesn't work)

If you want to allow all origins (for development only):

```python
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Simple CORS - allows all origins (development only!)
    CORS(app)
    
    # ... rest of code ...
```

---

## Verify Fix

After restarting Flask server:

1. Open browser: http://localhost:8080
2. Open DevTools Console (F12)
3. Refresh page
4. **No more CORS errors should appear!**

Expected logs:
```
✅ 200 OK - http://localhost:5001/api/v2/patients/me
✅ Demo patient loaded successfully
```

---

## What This Fixes

Before:
```
❌ CORS policy error
❌ net::ERR_FAILED
❌ Demo patient not found
```

After:
```
✅ API requests work
✅ Patient data loaded
✅ Upload page shows report options
✅ All features functional
```

---

## Next Steps After CORS Fix

1. ✅ CORS fixed → API calls work
2. ✅ Login with demo: 9999999999 / 123456
3. ✅ Navigate to upload page - report options visible
4. 📋 Add upload endpoints (from BACKEND_UPLOAD_ENDPOINTS.md)
5. 🎉 Full upload functionality working

---

**Quick Command Summary:**

```powershell
# Install flask-cors
cd D:\Vinay\aaha-kiosk-main\CHWapp-main
pip install flask-cors

# Edit app/__init__.py (add CORS code above)

# Restart server
py run.py
```

---

**Status:** Ready to implement  
**Priority:** HIGH (blocking all API calls)  
**Time:** 2 minutes

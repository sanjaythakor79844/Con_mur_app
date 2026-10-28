# PDF CORS Fix - Google Cloud Storage Configuration

## Problem Summary

**Error:** `No 'Access-Control-Allow-Origin' header is present on the requested resource`

**Root Cause:** GCS bucket `aaha-reports` does not have CORS configured to allow JavaScript fetch from the frontend origin `https://con-mur-app.onrender.com`.

**Impact:** 
- ✅ Direct PDF viewing works (via `window.open()`)
- ❌ PDF parsing fails (biological age, biomarker extraction)
- ❌ Patient identity verification unavailable

---

## Solution: Configure GCS Bucket CORS

### Option 1: Using Google Cloud Console (Easiest)

1. Go to: https://console.cloud.google.com/storage/browser
2. Click on bucket: `aaha-reports`
3. Go to **"Permissions"** tab
4. Click **"CORS configuration"** section
5. Click **"Edit CORS configuration"**
6. Paste this configuration:

```json
[
  {
    "origin": ["https://con-mur-app.onrender.com"],
    "method": ["GET", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Accept-Ranges",
      "Content-Disposition"
    ],
    "maxAgeSeconds": 3600
  }
]
```

7. Click **"Save"**

---

### Option 2: Using gsutil CLI (Recommended for DevOps)

#### Step 1: Install Google Cloud SDK

**Windows:**
```powershell
# Download from: https://cloud.google.com/sdk/docs/install
# Or use Chocolatey:
choco install gcloudsdk
```

**Linux/Mac:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

#### Step 2: Authenticate

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### Step 3: Apply CORS Configuration

```bash
# From project root directory
gsutil cors set cors-config.json gs://aaha-reports
```

#### Step 4: Verify Configuration

```bash
gsutil cors get gs://aaha-reports
```

**Expected Output:**
```json
[
  {
    "origin": ["https://con-mur-app.onrender.com"],
    "method": ["GET", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Accept-Ranges",
      "Content-Disposition"
    ],
    "maxAgeSeconds": 3600
  }
]
```

---

## Testing After Fix

### Test 1: Direct PDF Fetch (Should Work)

```javascript
// In browser console on https://con-mur-app.onrender.com
const testUrl = 'YOUR_SIGNED_PDF_URL_HERE';
const res = await fetch(testUrl, { mode: 'cors' });
console.log('Status:', res.status); // Should be 200
console.log('CORS Headers:', res.headers.get('access-control-allow-origin')); // Should be *
```

### Test 2: PDF Parsing (Should Extract Data)

```javascript
// This should now work without errors
const data = await extractLongevityPdfData(signedUrl);
console.log('Biological Age:', data.biologicalAge); // Should show actual value, not null
console.log('Patient Name:', data.patientName); // Should show actual name
```

### Test 3: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by: `storage.googleapis.com`
3. Load report with PDF
4. Check PDF request:
   - ✅ Status: 200 OK
   - ✅ Response Header: `Access-Control-Allow-Origin: https://con-mur-app.onrender.com` or `*`

---

## Security Considerations

### Why This Fix Is Safe:

1. **Signed URLs still required** - CORS just allows the browser to read the response
2. **Time-limited access** - Signed URLs expire (backend controls expiry)
3. **Patient-specific** - Backend generates URLs only for authorized patients
4. **No credentials exposed** - CORS config is just browser policy, not authentication

### What CORS Does:

- **Allows:** Browser JavaScript from `https://con-mur-app.onrender.com` to fetch PDF bytes
- **Does NOT:** Give unauthorized access to PDFs
- **Does NOT:** Bypass signed URL expiry or signature validation
- **Does NOT:** Allow other origins (only the specified origin)

---

## Alternative Solutions (If Needed)

### If You Can't Access GCS (No Admin Rights):

**Option B: Backend Proxy Enhancement**

The proxy endpoint at `/api/proxy-pdf` can be used, but it currently:
- ❌ Likely fails because server-side fetch also needs CORS
- ⚠️ No patient authorization check

**To fix proxy:**
1. Backend needs to fetch PDF using service account (no CORS issues)
2. Add patient authorization check
3. Return PDF with proper CORS headers

**Contact backend team to implement:**
```
GET /api/v2/reports/{report_id}/pdf
Authorization: Bearer <firebase_token>

Returns: PDF blob with CORS headers
```

---

## Troubleshooting

### Issue: CORS still failing after configuration

**Check 1: Verify configuration applied**
```bash
gsutil cors get gs://aaha-reports
```

**Check 2: Wait for propagation** (can take 1-2 minutes)

**Check 3: Clear browser cache**
```
Ctrl+Shift+Delete → Cached images and files → Clear
```

**Check 4: Verify signed URL is valid**
- Signed URLs must not be expired
- Must be from `storage.googleapis.com` domain

### Issue: "Access denied" error

- Check bucket permissions
- Ensure service account has `storage.objectViewer` role
- Verify signed URL signature

### Issue: Pre-flight OPTIONS request failing

**Add OPTIONS method** if not already in CORS config:
```json
{
  "method": ["GET", "OPTIONS"]  ← OPTIONS is required
}
```

---

## Production Deployment Checklist

### Before Applying CORS:

- [x] Review CORS configuration
- [x] Confirm frontend origin URL is correct
- [ ] Get approval from security team
- [ ] Backup current bucket configuration (if any)

### After Applying CORS:

- [ ] Test PDF viewing on production
- [ ] Test PDF parsing (biological age extraction)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Monitor error logs for CORS-related issues
- [ ] Update documentation

---

## Monitoring

### Check for CORS Errors in Production:

**Frontend (Browser Console):**
```javascript
// Look for these errors
"blocked by CORS policy"
"No 'Access-Control-Allow-Origin' header"
```

**Backend (Server Logs):**
```
# Look for 403/401 responses from storage.googleapis.com
```

### Metrics to Track:

1. **PDF fetch success rate** - Should increase to ~100%
2. **PDF parsing errors** - Should decrease to ~0%
3. **Biological age display** - Should show actual values, not "--"

---

## Rollback Plan

**If CORS causes issues:**

```bash
# Remove CORS configuration
gsutil cors set cors-empty.json gs://aaha-reports
```

**cors-empty.json:**
```json
[]
```

**Or restore previous config:**
```bash
# If you backed up
gsutil cors set cors-backup.json gs://aaha-reports
```

---

## Additional Origins (Optional)

**To allow multiple origins** (e.g., staging, localhost):

```json
[
  {
    "origin": [
      "https://con-mur-app.onrender.com",
      "https://staging.example.com",
      "http://localhost:8080"
    ],
    "method": ["GET", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Accept-Ranges",
      "Content-Disposition"
    ],
    "maxAgeSeconds": 3600
  }
]
```

---

## Reference Documentation

- [GCS CORS Configuration](https://cloud.google.com/storage/docs/cross-origin)
- [gsutil cors command](https://cloud.google.com/storage/docs/gsutil/commands/cors)
- [CORS Explained (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Status:** Ready to apply  
**Risk Level:** Low (safe, reversible)  
**Estimated Time:** 5-10 minutes  
**Impact:** Fixes PDF parsing for all users immediately

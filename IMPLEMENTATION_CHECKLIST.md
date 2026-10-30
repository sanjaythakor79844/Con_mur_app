# Android PDF Fix - Implementation Checklist

## ✅ Completed

### 1. Dependencies
- [x] Added `@capacitor/filesystem@6.0.4` to package.json
- [x] Added `@capacitor/browser@6.0.4` to package.json
- [x] Added `@capawesome-team/capacitor-file-opener@6.1.0` to package.json

### 2. Android Configuration
- [x] Updated `file_paths.xml` with all required paths
- [x] Verified AndroidManifest.xml FileProvider configuration

### 3. Code Implementation
- [x] Added Capacitor imports to `src/routes/liv.tsx`
- [x] Implemented Android-native `handlePdfAction()` function
- [x] Added platform detection (`Capacitor.isNativePlatform()`)
- [x] Implemented Blob → base64 → Filesystem → FileOpener flow
- [x] Fixed blood report PDF opening (line ~6940)
- [x] Preserved existing web browser implementation
- [x] Added proper error handling for Android

### 4. Documentation
- [x] Created ANDROID_PDF_FIX_SUMMARY.md
- [x] Created IMPLEMENTATION_CHECKLIST.md

---

## 🔄 Next Steps (User Action Required)

### Step 1: Install Dependencies
```bash
cd health-pulse-fix-main
npm install
```
**Expected**: Install 3 new Capacitor plugins + dependencies  
**Time**: 2-5 minutes

### Step 2: Build Project
```bash
npm run build
```
**Expected**: Clean build with no errors  
**Time**: 1-3 minutes

### Step 3: Sync Android Project
```bash
npx cap sync android
```
**Expected**: Copy web assets + register native plugins  
**Time**: 10-30 seconds

### Step 4: Open Android Studio
```bash
npx cap open android
```
**Expected**: Android Studio opens the project  
**Alternative**: Open `android/` folder manually in Android Studio

### Step 5: Build APK
**Option A - Debug APK**:
```bash
cd android
./gradlew assembleDebug
```
**Output**: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B - Release APK** (for production):
```bash
cd android
./gradlew assembleRelease
```
**Output**: `android/app/build/outputs/apk/release/app-release.apk`

### Step 6: Install APK on Device
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```
**Alternative**: Copy APK to device and install manually

---

## 🧪 Testing Checklist

### Critical Tests (Must Pass)

#### Test 1: Longevity Report PDF Download (Android APK)
- [ ] Open Liv app on Android device
- [ ] Navigate to any Longevity Report
- [ ] Tap download icon (down arrow)
- [ ] Verify: PDF opens in native PDF viewer
- [ ] Verify: All pages visible
- [ ] Verify: Toast shows "PDF downloaded successfully"

#### Test 2: Longevity Report PDF View (Android APK)
- [ ] Tap "Download PDF" button in report
- [ ] Verify: Same behavior as Test 1

#### Test 3: Blood Report PDF View (Android APK)
- [ ] Navigate to Lab Results section
- [ ] Tap "View file →" on any uploaded report
- [ ] Verify: PDF opens correctly
- [ ] Verify: Toast shows "Opening file..."

#### Test 4: Web Functionality (Render-hosted)
- [ ] Open https://con-mur-app.onrender.com
- [ ] Test PDF view/download
- [ ] Verify: Opens in new browser tab (no change)
- [ ] Verify: Download works as before

#### Test 5: Expired URL Handling
- [ ] Wait 1+ hour after opening report
- [ ] Try opening PDF again
- [ ] Verify: "Refreshing secure report link..." toast
- [ ] Verify: PDF opens after refresh

### Edge Cases

#### Test 6: No PDF Available
- [ ] Find assessment without `report_pdf_url`
- [ ] Verify: "PDF report is not available" toast
- [ ] Verify: No app crash

#### Test 7: Network Failure
- [ ] Enable airplane mode
- [ ] Try opening PDF
- [ ] Verify: Error toast shown
- [ ] Verify: App remains functional

#### Test 8: Multiple PDFs
- [ ] Open 3+ different reports
- [ ] Verify: Each opens correctly
- [ ] Verify: Filenames are unique
- [ ] Verify: No file conflicts

---

## 🐛 Debugging Guide

### If PDF doesn't open in APK:

#### 1. Check Logcat
```bash
adb logcat | grep -i "pdf\|FileOpener\|Filesystem"
```
**Look for**: Error messages from Capacitor plugins

#### 2. Verify Plugin Installation
```bash
ls node_modules/@capacitor/filesystem
ls node_modules/@capacitor/browser
ls node_modules/@capawesome-team/capacitor-file-opener
```
**Expected**: Each directory exists

#### 3. Check Android Plugin Registration
**File**: `android/app/src/main/java/com/aaha/companion/MainActivity.java`
```java
// Should import plugins automatically via Capacitor
```

#### 4. Test File Write Permissions
Add temporary log in code:
```typescript
const result = await Filesystem.writeFile({
  path: 'test.txt',
  data: 'test',
  directory: Directory.Cache,
});
console.log('File write test:', result.uri);
```

#### 5. Check PDF Viewer App
- Open any PDF from device file manager
- If fails: Install Google PDF Viewer or Adobe Reader

### If Web functionality broken:

#### 1. Check Platform Detection
Add log:
```typescript
console.log('Is native platform:', Capacitor.isNativePlatform());
```
**Expected in browser**: `false`

#### 2. Verify Blob URL Creation
```typescript
const blobUrl = URL.createObjectURL(blob);
console.log('Blob URL created:', blobUrl);
```
**Expected**: `blob:https://...`

#### 3. Test in Incognito Mode
- Rules out browser cache issues

---

## 📊 Performance Benchmarks

### Expected Timings (Android)

| Operation | Time | Acceptable Range |
|-----------|------|------------------|
| Fetch PDF | 500-2000ms | Network dependent |
| Base64 convert | 50-100ms | <200ms |
| Write to cache | 20-50ms | <100ms |
| FileOpener launch | 100-200ms | <500ms |
| **Total** | ~700-2350ms | <3000ms |

### Memory Usage

| PDF Size | Memory Impact |
|----------|---------------|
| 1 MB | ~3-4 MB (base64 overhead) |
| 5 MB | ~15-20 MB |
| 10 MB | ~30-40 MB |

**Warning**: PDFs >10MB may cause issues on low-memory devices

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All critical tests passed
- [ ] Web functionality verified unchanged
- [ ] Android APK tested on 2+ devices
- [ ] Error handling verified
- [ ] Performance acceptable (<3s PDF open)

### Deployment Steps

1. [ ] Commit changes to git
   ```bash
   git add .
   git commit -m "fix: implement Android-native PDF view/download"
   ```

2. [ ] Push to repository
   ```bash
   git push origin main
   ```

3. [ ] Deploy web app (Render)
   - Render auto-deploys on push
   - Verify deployment succeeds

4. [ ] Build production APK
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

5. [ ] Sign APK (if not auto-signed)
   ```bash
   # Use your signing key
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
     -keystore your-keystore.jks \
     app-release-unsigned.apk your-key-alias
   ```

6. [ ] Distribute APK
   - Upload to Play Store, or
   - Distribute via internal channels

### Post-Deployment

- [ ] Monitor error logs (first 24 hours)
- [ ] Check user feedback
- [ ] Verify no regression reports
- [ ] Document any new issues

---

## 📝 Modified Files Summary

| File | Status | Lines Changed |
|------|--------|---------------|
| `package.json` | Modified | +3 dependencies |
| `android/app/src/main/res/xml/file_paths.xml` | Modified | +5 paths |
| `src/routes/liv.tsx` | Modified | ~200 lines |
| `ANDROID_PDF_FIX_SUMMARY.md` | Created | New |
| `IMPLEMENTATION_CHECKLIST.md` | Created | New |

---

## ✅ Sign-Off

### Implementation Complete
- [x] Code changes implemented
- [x] Android configuration updated
- [x] Documentation created
- [x] Ready for user testing

### Awaiting User Action
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Run `npx cap sync android`
- [ ] Build and test APK
- [ ] Verify web functionality
- [ ] Deploy to production

---

**Last Updated**: 2026-10-30  
**Implementer**: Kiro AI  
**Status**: ✅ Implementation Complete - Awaiting User Testing

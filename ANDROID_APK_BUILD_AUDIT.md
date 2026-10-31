# Android APK Build and Update Process Audit

**Audit Date**: 2026-10-30  
**Project**: AAHA Liv Consumer App  
**Repository**: sanjaythakor79844/Con_mur_app  
**Current Branch**: `main`  
**Latest Commit**: `d445fe18786db443c3f2e1c4d0d5294f683a6fb9`  
**Commit Message**: "chore: update Android build files after Capacitor plugin installation"

---

## Executive Summary

**Status**: ⚠️ **CRITICAL ISSUES IDENTIFIED**

The Android APK build process has several critical issues that prevent the latest code changes (Android PDF fix and empty state improvements) from being included in the APK:

1. ✅ **GitHub Actions workflow exists** but requires **manual trigger**
2. ⚠️ **APK not built automatically** on push
3. ✅ **Latest plugins registered** in Capacitor
4. ⚠️ **Version not incremented** - still at 1.0.0
5. ✅ **Server URL correctly configured** for hosted app
6. ⚠️ **No commit SHA in artifact name** - hard to identify which build
7. ⚠️ **Installed APK likely outdated** - no automatic builds triggered

---

## 1. GitHub Actions Workflow Analysis

### Workflow File
**Path**: `.github/workflows/android-apk.yml`  
**Name**: "Build AAHA Android APK"  
**Trigger**: `workflow_dispatch` (Manual only)  
**Runner**: `ubuntu-latest`

### ⚠️ ISSUE: Manual Trigger Only
```yaml
on:
  workflow_dispatch:
```

**Problem**: The workflow does NOT run automatically on push. It must be manually triggered through GitHub Actions UI.

**Recommendation**:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'android/**'
      - 'package.json'
      - 'capacitor.config.ts'
  workflow_dispatch:
```

### Workflow Steps Analysis

| Step | Status | Notes |
|------|--------|-------|
| Checkout source | ✅ Good | Uses `actions/checkout@v4` |
| Setup Node.js 20 | ✅ Good | With npm cache |
| Setup Java 17 | ✅ Good | Uses Temurin distribution |
| Install dependencies | ✅ Good | Uses `npm ci` |
| Build application | ✅ Good | Runs `npm run build` |
| Setup Android SDK | ✅ Good | Uses `android-actions/setup-android@v4` |
| Install SDK packages | ✅ Good | Installs Android 34 (matches compileSdk) |
| Sync Capacitor | ✅ Good | Runs `npx cap sync android` |
| Build APK | ✅ Good | Runs `./gradlew assembleDebug` |
| Upload artifact | ⚠️ Issue | Generic name, no commit SHA |

### ⚠️ ISSUE: Artifact Naming
```yaml
with:
  name: AAHA-debug-APK
  path: android/app/build/outputs/apk/debug/app-debug.apk
```

**Problem**: Artifact name is always the same. Cannot identify which commit it's from.

**Recommendation**:
```yaml
with:
  name: AAHA-debug-${{ github.sha }}-${{ github.run_number }}
  path: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 2. Commit and Branch Status

### Current State
```
Branch: main
HEAD: d445fe1 (chore: update Android build files after Capacitor plugin installation)
Origin: In sync ✅
```

### Recent Commits (Not in APK)
```
d445fe1 - chore: update Android build files after Capacitor plugin installation
33b9fdc - docs: add comprehensive implementation documentation
822ca31 - feat: implement Android-native PDF view and download ⚠️ NOT IN APK
aae9481 - fix: replace -- with em dash in Last check-in mini vitals
488f499 - fix: correct TanStack Router version to 1.170.46
```

### ⚠️ CRITICAL: Latest Android PDF Fix NOT in APK
**Commit `822ca31`** introduced:
- Capacitor Browser plugin
- Capacitor Filesystem plugin
- Capawesome File Opener plugin
- Native Android PDF handling code

**Status**: ⚠️ **These changes are in source code but NOT in any built APK**

---

## 3. Capacitor Configuration

### capacitor.config.ts
**Path**: `capacitor.config.ts`  
**Status**: ✅ **CORRECT - Uses hosted app**

```typescript
const config: CapacitorConfig = {
  appId: "com.aaha.companion",
  appName: "AAHA",
  webDir: "capacitor-shell",
  server: {
    url: "https://con-mur-app.onrender.com",  // ✅ Hosted app
    cleartext: false,
    androidScheme: "https",
  },
```

**Analysis**:
- ✅ Uses `server.url` for hosted app (correct approach)
- ✅ `webDir` points to `capacitor-shell` (fallback only)
- ✅ HTTPS scheme enforced
- ✅ No mixed content allowed

### capacitor-shell/index.html
**Purpose**: Offline fallback / loader  
**Status**: ✅ Correctly redirects to Render URL

```javascript
const PROD_URL = "https://con-mur-app.onrender.com";
setTimeout(() => {
  window.location.href = PROD_URL;
}, 500);
```

**Analysis**:
- ✅ Shows loading spinner
- ✅ Redirects to production URL after 500ms
- ✅ Retry button after 10 seconds
- ✅ Good UX for network issues

### Android Assets Configuration
**Path**: `android/app/src/main/assets/capacitor.config.json`  
**Status**: ✅ Synced correctly

```json
{
  "appId": "com.aaha.companion",
  "appName": "AAHA",
  "webDir": "capacitor-shell",
  "server": {
    "url": "https://con-mur-app.onrender.com",
    "cleartext": false,
    "androidScheme": "https"
  }
}
```

**Analysis**: ✅ Matches TypeScript config

---

## 4. Plugin Registration

### android/app/capacitor.build.gradle
**Status**: ✅ **ALL PLUGINS REGISTERED**

```gradle
dependencies {
    implementation project(':capacitor-app')
    implementation project(':capacitor-browser')          // ✅ NEW
    implementation project(':capacitor-filesystem')       // ✅ NEW
    implementation project(':capawesome-team-capacitor-file-opener')  // ✅ NEW
}
```

**Analysis**:
- ✅ Browser plugin registered
- ✅ Filesystem plugin registered
- ✅ File Opener plugin registered
- ✅ App plugin (existing)

### android/capacitor.settings.gradle
**Status**: ✅ **ALL PLUGINS LINKED**

```gradle
include ':capacitor-browser'
project(':capacitor-browser').projectDir = new File('../node_modules/@capacitor/browser/android')

include ':capacitor-filesystem'
project(':capacitor-filesystem').projectDir = new File('../node_modules/@capacitor/filesystem/android')

include ':capawesome-team-capacitor-file-opener'
project(':capawesome-team-capacitor-file-opener').projectDir = new File('../node_modules/@capawesome-team/capacitor-file-opener/android')
```

**Analysis**: ✅ Correct paths to node_modules

### android/app/src/main/assets/capacitor.plugins.json
**Status**: ✅ **PLUGINS CORRECTLY REGISTERED**

```json
[
  { "pkg": "@capacitor/app", "classpath": "com.capacitorjs.plugins.app.AppPlugin" },
  { "pkg": "@capacitor/browser", "classpath": "com.capacitorjs.plugins.browser.BrowserPlugin" },
  { "pkg": "@capacitor/filesystem", "classpath": "com.capacitorjs.plugins.filesystem.FilesystemPlugin" },
  { "pkg": "@capawesome-team/capacitor-file-opener", "classpath": "io.capawesome.capacitorjs.plugins.fileopener.FileOpenerPlugin" }
]
```

**Analysis**: ✅ All 3 new plugins present with correct classpaths

---

## 5. App Version Information

### android/app/build.gradle
**Path**: `android/app/build.gradle`  
**Status**: ⚠️ **VERSION NOT UPDATED**

```gradle
defaultConfig {
    applicationId "com.aaha.companion"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1                    // ⚠️ Still 1
    versionName "1.0.0"             // ⚠️ Still 1.0.0
```

### ⚠️ ISSUE: Version Not Incremented
**Problem**:
- PDF fix is a major feature (should be 1.1.0 or 2.0.0)
- Empty state improvements are UI enhancements
- No way to distinguish new APK from old APK by version

**Recommendation**:
```gradle
versionCode 2              // Increment for new build
versionName "1.1.0"       // Or "2.0.0" for PDF feature
```

### package.json
**Status**: ❌ **NO VERSION FIELD**

```json
{
  "name": "tanstack_start_ts",
  "private": true,
  // No version field
}
```

**Recommendation**: Add version for tracking
```json
{
  "name": "tanstack_start_ts",
  "version": "1.1.0",
  "private": true,
}
```

---

## 6. Android SDK Versions

### android/variables.gradle
**Status**: ✅ **UP TO DATE**

```gradle
ext {
    minSdkVersion = 22              // ✅ Android 5.1+ (covers 99%+ devices)
    compileSdkVersion = 34          // ✅ Android 14 (latest stable)
    targetSdkVersion = 34           // ✅ Android 14
    // ... other dependencies
}
```

**Analysis**:
- ✅ Minimum SDK 22 is reasonable
- ✅ Target SDK 34 is current (Play Store requirement)
- ✅ Compile SDK 34 matches

---

## 7. Build Output Status

### Local Build Directory
**Path**: `android/app/build/outputs/apk`  
**Status**: ❌ **DOES NOT EXIST**

**Analysis**:
- No local APK has been built on this machine
- GitHub Actions builds in CI environment
- Artifacts uploaded to GitHub, not committed to repo

### ⚠️ ISSUE: No Way to Verify Current APK
**Problem**:
1. No local APK to test
2. No automatic GitHub Actions builds
3. No commit SHA in artifact name
4. **Cannot verify which version is currently installed on device**

---

## 8. File Paths Configuration

### android/app/src/main/res/xml/file_paths.xml
**Status**: ✅ **UPDATED FOR PDF FUNCTIONALITY**

```xml
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <files-path name="files" path="." />
    <cache-path name="cache" path="." />
    <external-files-path name="external-files" path="." />
    <external-cache-path name="external-cache" path="." />
    <external-path name="external" path="." />
    <!-- Original paths preserved -->
    <external-path name="my_images" path="." />
    <cache-path name="my_cache_images" path="." />
</paths>
```

**Analysis**:
- ✅ Added paths required for PDF download/storage
- ✅ Preserved original paths
- ✅ Covers cache, files, external storage

---

## 9. AndroidManifest.xml

### android/app/src/main/AndroidManifest.xml
**Status**: ✅ **CORRECT CONFIGURATION**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <!-- FileProvider already configured -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

**Analysis**:
- ✅ FileProvider configured
- ✅ Correct authority (${applicationId}.fileprovider)
- ✅ Points to file_paths.xml
- ✅ INTERNET permission granted

---

## 10. Critical Issues Summary

### 🔴 HIGH PRIORITY

#### Issue 1: No Automatic APK Builds
**Impact**: Latest code (Android PDF fix, empty states) NOT in any APK  
**Location**: `.github/workflows/android-apk.yml`  
**Current**: Manual trigger only (`workflow_dispatch`)  
**Risk**: **Installed APK is definitely outdated**

**Fix Needed**:
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

#### Issue 2: Version Not Incremented
**Impact**: Cannot distinguish new APK from old APK  
**Location**: `android/app/build.gradle` line 11-12  
**Current**: versionCode 1, versionName "1.0.0"  
**Risk**: Users may install old APK thinking it's new

**Fix Needed**:
```gradle
versionCode 2
versionName "1.1.0"  // or "2.0.0"
```

#### Issue 3: No Commit SHA in Artifact Name
**Impact**: Cannot identify which commit an APK was built from  
**Location**: `.github/workflows/android-apk.yml` line 53  
**Current**: `name: AAHA-debug-APK`  
**Risk**: Confusion about which APK has which features

**Fix Needed**:
```yaml
name: AAHA-debug-${{ github.sha }}-${{ github.run_number }}
```

### 🟡 MEDIUM PRIORITY

#### Issue 4: No APK Built After Latest Push
**Impact**: PDF fix commit `822ca31` not built into APK  
**Status**: Manual workflow trigger required  
**Risk**: Testing cannot be performed

#### Issue 5: No Version in package.json
**Impact**: Harder to track releases  
**Location**: `package.json`  
**Recommendation**: Add version field

---

## 11. Verification Checklist

### What's Working ✅
- [x] Capacitor configuration uses hosted URL
- [x] All 3 new plugins registered in Gradle
- [x] All 3 new plugins in capacitor.plugins.json
- [x] File paths configured for PDF storage
- [x] FileProvider configured in AndroidManifest
- [x] GitHub Actions workflow exists and is valid
- [x] Workflow builds from correct branch (main)
- [x] Android SDK versions are current

### What's NOT Working ⚠️
- [ ] **APK not built automatically on push**
- [ ] **Latest code NOT in any APK**
- [ ] **Version not incremented**
- [ ] **No commit SHA in artifact name**
- [ ] **Cannot identify which APK is installed**
- [ ] **PDF functionality untested in APK**

---

## 12. Recommended Actions

### Immediate (Before Testing)

1. **Update Version Numbers**
   ```gradle
   // android/app/build.gradle
   versionCode 2
   versionName "1.1.0"
   ```

2. **Trigger Manual Build**
   - Go to GitHub → Actions tab
   - Select "Build AAHA Android APK" workflow
   - Click "Run workflow" on main branch
   - Wait for build to complete
   - Download `AAHA-debug-APK` artifact

3. **Install Fresh APK**
   - Uninstall any existing AAHA app
   - Install newly downloaded APK
   - Test PDF functionality

### Short-Term (This Week)

4. **Enable Automatic Builds**
   ```yaml
   # .github/workflows/android-apk.yml
   on:
     push:
       branches: [main]
       paths:
         - 'src/**'
         - 'android/**'
         - 'package.json'
         - 'capacitor.config.ts'
     workflow_dispatch:
   ```

5. **Improve Artifact Naming**
   ```yaml
   name: AAHA-debug-${{ github.sha }}-${{ github.run_number }}
   ```

6. **Add Commit Info to APK**
   ```yaml
   - name: Generate build info
     run: |
       echo "BUILD_SHA=${{ github.sha }}" >> $GITHUB_ENV
       echo "BUILD_DATE=$(date -u +'%Y-%m-%d %H:%M:%S UTC')" >> $GITHUB_ENV
   ```

### Long-Term (Next Sprint)

7. **Add Release Builds**
   - Create signed release APK workflow
   - Add keystore secrets
   - Version tagging

8. **Add Build Notifications**
   - Slack/Discord webhook on build complete
   - Email notification on failure

9. **Add Version Tracking**
   - Add version to package.json
   - Sync with Android versionName

---

## 13. Testing Verification Plan

### After Building Fresh APK

1. **Verify APK Contains Latest Code**
   - Check versionCode is 2
   - Check versionName is "1.1.0"
   - Confirm build date is recent

2. **Test PDF Functionality**
   - Open Longevity Report
   - Tap PDF download button
   - Verify: PDF opens in native Android viewer
   - Test: Blood report PDF viewing

3. **Test Empty States**
   - Check: All `—` (em dash) displays correctly
   - Verify: No `--` (double dash) remains

4. **Test Existing Features**
   - Sign in works
   - Reports load
   - Care plans work
   - No regressions

---

## 14. Conclusion

### Current State
- ✅ Code is ready and pushed to GitHub
- ✅ Plugins are properly configured
- ✅ Capacitor config is correct
- ⚠️ **APK has NOT been built with latest changes**
- ⚠️ **Installed APK is definitely outdated**
- ⚠️ **No way to identify APK versions**

### Required Actions
1. **Increment version to 1.1.0**
2. **Manually trigger GitHub Actions build**
3. **Download and install fresh APK**
4. **Test PDF functionality**
5. **Enable automatic builds for future pushes**

### Risk Assessment
**High Risk**: Testing is being performed on outdated APK that doesn't contain:
- Android-native PDF viewing
- Capacitor Filesystem plugin
- Capacitor Browser plugin
- File Opener plugin
- Empty state improvements (em dash)

**Recommendation**: **STOP testing current APK. Build fresh APK first.**

---

**Audit Completed**: 2026-10-30  
**Auditor**: Kiro AI  
**Status**: ⚠️ CRITICAL - Fresh build required before testing  
**Next Action**: Manually trigger GitHub Actions workflow

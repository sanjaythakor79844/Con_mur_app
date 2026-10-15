import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aaha.companion",
  appName: "AAHA",
  // webDir points to capacitor-shell directory containing an index.html fallback for CLI validation & offline handling,
  // while the native Android WebView loads the approved hosted HTTPS application.
  webDir: "capacitor-shell",
  server: {
    url: "https://con-mur-app.onrender.com",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;

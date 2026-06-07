# BreakFit — Native Wrapper (Capacitor)

The web app is the source of truth. Capacitor wraps the **production web build** in a
native iOS/Android shell, which unlocks three things a browser PWA cannot do well:

- **Apple Health / Google Health Connect** writes via the existing `window.bfHealth`
  seam (`src/app/core/services/health.service.ts`) — see *Health plugin* below.
- **Reliable native push** (APNs/FCM) — see *Push* below (follow-up).
- **App Store / Play Store distribution.**

The Angular build pulls in **no** Capacitor packages: `native-bridge.ts` detects the
runtime via the injected `window.Capacitor` global, so `npm run build` and the PWA are
unchanged. This file documents the native side, which uses CLI tools that need a Mac/
Xcode (iOS) and Android Studio (Android) and therefore must be run on your machine.

---

## 1. Prerequisites

- Node 22.x (same as the web app — see `.nvmrc`).
- **iOS:** macOS + Xcode + CocoaPods (`sudo gem install cocoapods`).
- **Android:** Android Studio + an SDK/emulator.

## 2. One-time setup

```bash
# install runtime + CLI (npm writes them into package.json)
npm i @capacitor/core@latest @capacitor/app@latest @capacitor/status-bar@latest @capacitor/splash-screen@latest
npm i -D @capacitor/cli@latest

# capacitor.config.ts already exists in the repo (appId app.breakfit, webDir dist/breakfit/browser)

# build the web app first, then add the native platforms
npm run build
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` folders (commit them — they hold native config).

## 3. Build & run loop

Every time the web code changes:

```bash
npm run build
npx cap sync          # copies dist/ into the native projects + updates plugins
npx cap open ios      # opens Xcode    -> Run
npx cap open android  # opens Android Studio -> Run
```

`npx cap run ios` / `npx cap run android` also work for a connected device/emulator.

## 4. API base inside the native shell (important)

In the WebView the app origin is `capacitor://localhost` (iOS) / `https://localhost`
(Android), and **`localhost` means the device, not your dev machine.** So the
`apiBase: 'http://localhost:8080'` used for desktop testing will **not** reach your
local API from a phone/emulator. Options:

- **Easiest:** point `apiBase` (in `src/environments/environment.production.ts`) at your
  machine's LAN IP, e.g. `http://192.168.1.50:8080`, and set the API's
  `CORS_ORIGIN` to include the WebView origins:
  `CORS_ORIGIN=capacitor://localhost,https://localhost,http://localhost:4200`.
- **Android cleartext:** plain `http://<ip>` is blocked by default. For LAN dev only,
  set `android.allowMixedContent: true` in `capacitor.config.ts` **or** add a network
  security config allowing your IP. Don't ship cleartext.
- **Best for real builds:** deploy the API over HTTPS and set `apiBase` to that URL.

Rebuild (`npm run build && npx cap sync`) after changing the environment.

## 5. Health plugin (`Health`)

`native-bridge.ts` registers `window.bfHealth` backed by a custom Capacitor plugin
named **`Health`** with two methods: `isAvailable()` → `{ available: boolean }` and
`logWorkout({ type, name, start, durationSec, kcal })`. Implement it natively. The
stubs below register the plugin and compile; the actual HealthKit / Health Connect
writes are marked `TODO` because they need entitlements + a runtime permission flow.

Copy the ready-made implementations from the repo:

- iOS: `native/ios/HealthPlugin.swift` + `native/ios/HealthPlugin.m` → `ios/App/App/`
- Android: `native/android/HealthPlugin.kt` → `android/app/src/main/java/app/breakfit/`

They implement the full write path (HealthKit `HKWorkoutBuilder` / Health Connect
`ExerciseSessionRecord` + `ActiveCaloriesBurnedRecord`) including the permission
request. Then apply the platform config below.

### iOS config

1. `npx cap open ios`, select the **App** target → **Signing & Capabilities**, set a **Team**.
2. **+ Capability** → **HealthKit** (leave "Clinical Health Records" off). This writes
   `com.apple.developer.healthkit = YES` into `App/App.entitlements`.
3. Add to `ios/App/App/Info.plist` (before the closing `</dict>`):

   ```xml
   <key>NSHealthUpdateUsageDescription</key>
   <string>BreakFit speichert abgeschlossene Bewegungspausen als Workouts in Apple Health.</string>
   ```

   (`HealthPlugin.m` registers the plugin; both files are auto-compiled by Xcode.)
4. Test HealthKit writes on a **real device** — the simulator's Health store is limited.

### Android config

1. **minSdk 26** (Health Connect requires it). In `android/variables.gradle` set
   `minSdkVersion = 26`.
2. Add the dependency in `android/app/build.gradle` (use the latest stable; example):

   ```gradle
   implementation "androidx.health.connect:connect-client:1.1.0-alpha10"
   implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1"
   ```

3. In `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`:

   ```xml
   <uses-permission android:name="android.permission.health.WRITE_EXERCISE" />
   <uses-permission android:name="android.permission.health.WRITE_ACTIVE_CALORIES_BURNED" />
   ```

   Health Connect also requires a **permissions-rationale** entry. Inside the
   `MainActivity`'s `<activity>` add:

   ```xml
   <intent-filter>
     <action android:name="androidx.health.connect.action.SHOW_PERMISSIONS_RATIONALE" />
   </intent-filter>
   ```

   and for Android 14+ (API 34) add, inside `<application>`:

   ```xml
   <activity-alias
       android:name="ViewPermissionUsageActivity"
       android:exported="true"
       android:targetActivity=".MainActivity"
       android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
     <intent-filter>
       <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
       <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
     </intent-filter>
   </activity-alias>
   ```

4. **Enable Kotlin** (Capacitor's Android template is Java; `HealthPlugin.kt`
   needs the Kotlin plugin to compile):
   - `android/build.gradle` (project), in `buildscript { dependencies { … } }`:
     ```gradle
     classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24'
     ```
   - top of `android/app/build.gradle`, after `apply plugin: 'com.android.application'`:
     ```gradle
     apply plugin: 'kotlin-android'
     ```
   - in the `android { … }` block, match jvmTarget to the existing
     `compileOptions { sourceCompatibility }` (usually 17 or 21):
     ```gradle
     kotlinOptions { jvmTarget = '17' }
     ```
5. Register the plugin in **`MainActivity.java`** (keep it Java; the Kotlin plugin
   class compiles to a Java class):

   ```java
   package app.breakfit;

   import android.os.Bundle;
   import com.getcapacitor.BridgeActivity;

   public class MainActivity extends BridgeActivity {
       @Override
       public void onCreate(Bundle savedInstanceState) {
           registerPlugin(HealthPlugin.class);
           super.onCreate(savedInstanceState);
       }
   }
   ```

> Version note: align the `connect-client` version with the latest Health Connect
> docs; the records/permission APIs above match the 1.1.x line. If Health Connect
> isn't installed on the device, `isAvailable()` returns false and the app keeps
> offering the **TCX export** fallback — nothing breaks.

## 6. Splash screen & status bar

Handled by `native-bridge.ts` via the optional `@capacitor/splash-screen` and
`@capacitor/status-bar` plugins (installed in step 2): the splash is hidden on launch
and the status bar is set to the dark style to match the app. Both calls are guarded,
so missing plugins are a no-op.

## 7. Local notifications (native reminder loop)

The app schedules an on-device notification for the end of the running phase
(focus -> "break due", break -> "break over") so reminders fire even when the
app is backgrounded or closed. This is wired in `NativeReminderService` +
`local-notifications.ts` (dependency-free; no-op on web). To enable it natively:

```bash
npm i @capacitor/local-notifications@latest
npm run build && npx cap sync
```

- **Permission:** the OS prompt appears the first time a timer starts (Android 13+
  and iOS require notification permission; the plugin requests it). The plugin adds
  the needed manifest permission on Android automatically.
- **Android small icon (optional but recommended):** add a white/transparent
  monochrome icon at `android/app/src/main/res/drawable/ic_stat_icon.png`, otherwise
  Android may render a generic square. (The code doesn't hard-require it.)
- **Behaviour:** respects the in-app "Benachrichtigungen" toggle, reschedules on
  start/resume, cancels on pause/reset. On web nothing changes — the foreground
  NotificationService handles cues there.

## 8. Push (follow-up)

Web Push (VAPID + Service Worker) keeps working in the installed PWA, but inside the
Capacitor WebView the reliable path is **native** push via `@capacitor/push-notifications`
(APNs on iOS, FCM on Android). The server already stores subscriptions and sends
payloads (`push.routes.ts`, `digest-scheduler.ts`); a native migration would:

1. Add `@capacitor/push-notifications`, register for a device token on launch.
2. Add a `POST /v1/push/native-token` route storing `{ platform, token }` alongside the
   existing web subscriptions.
3. Send via APNs/FCM for native tokens and keep web-push for browser subscriptions —
   `sendToUser` becomes a fan-out over both transports. The digest/reminder schedulers
   are unchanged (they already call `sendToUser`).

This is intentionally deferred — the wrapper above ships and runs first; push can be
layered on without touching app logic.

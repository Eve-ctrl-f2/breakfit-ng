# Health integration (Apple Health / Google Fit / Health Connect)

## Why this is split in two

A web PWA **cannot** write to Apple Health (HealthKit) or Android Health Connect
— there is no browser API for either, and Google Fit's REST API is deprecated.
So BreakFit ships two paths:

1. **Native bridge (real "link").** When BreakFit runs inside a native shell
   (Capacitor/Tauri) that injects a `window.bfHealth` object, completed breaks
   are written to the platform health store automatically.
2. **TCX file export (works everywhere).** A button in Settings → Health exports
   all completed breaks as a `.tcx` workout file, which Strava, Garmin Connect,
   Apple Health and Google Fit can import (directly or via those apps).

The app degrades gracefully: `HealthService.available()` is `true` only when a
bridge is present; otherwise the link toggle is hidden and only export is shown.

## Bridge contract

A native wrapper must inject this on `window` before the app boots:

```ts
window.bfHealth = {
  // optional: report whether the OS granted write permission
  isAvailable: () => true,
  // called once per completed break
  logWorkout: ({ type, name, start, durationSec, kcal }) => {
    // type: "strength_training" | "other"
    // start: ISO timestamp, durationSec/kcal: numbers (kcal is an estimate)
    // -> write a workout/active-energy sample to HealthKit / Health Connect
  },
};
```

`HealthService.logBreak()` calls `logWorkout` for each completed break **only**
when `available() && linked()`. Errors thrown by the native side are swallowed so
they never interrupt the user's break flow.

## Capacitor wiring (sketch)

This repo ships the web seam only; the native shell is a separate, thin project.

1. Wrap the built PWA with Capacitor (`npx cap init`, `cap add ios/android`).
2. Add a health plugin:
   - iOS: a small Capacitor plugin calling HealthKit (`HKHealthStore`,
     `HKWorkout` + active-energy samples), or `@perfood/capacitor-healthkit`.
   - Android: a plugin over **Health Connect** (`androidx.health.connect`),
     writing `ExerciseSessionRecord` + `ActiveCaloriesBurnedRecord`.
3. In the shell's web layer, request permission, then set `window.bfHealth` with
   a `logWorkout` that forwards to the plugin. Nothing else in the app changes.

## Estimates

Duration: rep-based exercises are estimated at ~3s/rep; time-based use their
seconds. Calories use a coarse `2 + intensity*1.2` kcal/min model. These are
clearly labeled as estimates in the UI and in TCX `<Calories>`.

## TCX notes

Each completed break becomes a `<Activity Sport="Other">` with a single `<Lap>`
(`TotalTimeSeconds`, `Calories`, `Intensity=Active`, `TriggerMethod=Manual`).
Minimal but valid TCX v2; importers that expect GPS tracks simply see a
track-less activity.

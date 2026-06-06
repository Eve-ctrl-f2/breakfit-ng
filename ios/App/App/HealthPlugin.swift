import Foundation
import Capacitor
import HealthKit

/// Capacitor plugin "Health" — writes completed BreakFit breaks to Apple Health
/// as workouts (with active energy burned). Matches the JS bridge in
/// `src/app/core/native/native-bridge.ts`:
///   isAvailable() -> { available: Bool }
///   logWorkout({ type, name, start, durationSec, kcal })
///
/// Place at: ios/App/App/HealthPlugin.swift (+ HealthPlugin.m for registration).
/// Requires the HealthKit capability and NSHealthUpdateUsageDescription (see CAPACITOR.md).
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin {
    private let store = HKHealthStore()
    private let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func logWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device"); return
        }
        guard let startStr = call.getString("start"), let start = Self.parseISO(startStr) else {
            call.reject("missing or invalid 'start'"); return
        }
        let durationSec = max(1.0, call.getDouble("durationSec") ?? 1.0)
        let kcal = max(0.0, call.getDouble("kcal") ?? 0.0)
        let type = call.getString("type") ?? "other"
        let end = start.addingTimeInterval(durationSec)

        // Only request write access; we never read the user's Health data.
        let toShare: Set<HKSampleType> = [HKObjectType.workoutType(), energyType]
        store.requestAuthorization(toShare: toShare, read: []) { [weak self] granted, error in
            guard let self = self else { return }
            if let error = error { call.reject("authorization error: \(error.localizedDescription)"); return }
            guard granted else { call.reject("Health authorization denied"); return }
            self.saveWorkout(type: type, start: start, end: end, kcal: kcal, call: call)
        }
    }

    private func saveWorkout(type: String, start: Date, end: Date, kcal: Double, call: CAPPluginCall) {
        let config = HKWorkoutConfiguration()
        config.activityType = (type == "strength_training") ? .functionalStrengthTraining : .other

        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())
        builder.beginCollection(withStart: start) { ok, error in
            if let error = error { call.reject("beginCollection: \(error.localizedDescription)"); return }
            guard ok else { call.reject("beginCollection failed"); return }

            let finish: () -> Void = {
                builder.endCollection(withEnd: end) { ok, error in
                    if let error = error { call.reject("endCollection: \(error.localizedDescription)"); return }
                    guard ok else { call.reject("endCollection failed"); return }
                    builder.finishWorkout { _, error in
                        if let error = error { call.reject("finishWorkout: \(error.localizedDescription)"); return }
                        call.resolve()
                    }
                }
            }

            if kcal > 0 {
                let quantity = HKQuantity(unit: .kilocalorie(), doubleValue: kcal)
                let sample = HKQuantitySample(type: self.energyType, quantity: quantity, start: start, end: end)
                builder.add([sample]) { ok, error in
                    if let error = error { call.reject("add energy: \(error.localizedDescription)"); return }
                    guard ok else { call.reject("add energy failed"); return }
                    finish()
                }
            } else {
                finish()
            }
        }
    }

    /// Accepts ISO-8601 with or without fractional seconds (JS `toISOString()` has ms).
    private static func parseISO(_ s: String) -> Date? {
        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = withFractional.date(from: s) { return d }
        return ISO8601DateFormatter().date(from: s)
    }
}

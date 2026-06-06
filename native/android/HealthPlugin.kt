package app.breakfit

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.units.Energy
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneOffset

/**
 * Capacitor plugin "Health" — writes completed BreakFit breaks to Android
 * Health Connect as exercise sessions (+ active calories). Mirrors the iOS
 * HealthKit plugin and the JS bridge in native-bridge.ts.
 *
 * Place at: android/app/src/main/java/app/breakfit/HealthPlugin.kt
 * Requires the Health Connect dependency, manifest permissions, a permissions
 * rationale intent-filter, minSdk 26, and registration in MainActivity
 * (see CAPACITOR.md).
 */
@CapacitorPlugin(name = "Health")
class HealthPlugin : Plugin() {

    private val permissions = setOf(
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(ActiveCaloriesBurnedRecord::class),
    )

    private fun client(): HealthConnectClient? =
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE)
            HealthConnectClient.getOrCreate(context)
        else null

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val ret = JSObject()
        ret.put("available", HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE)
        call.resolve(ret)
    }

    @PluginMethod
    fun logWorkout(call: PluginCall) {
        val hc = client() ?: run { call.reject("Health Connect not available"); return }
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (!granted.containsAll(permissions)) {
                    // Bounce to the Health Connect permission UI; resume in permsResult().
                    val intent: Intent = PermissionController
                        .createRequestPermissionResultContract()
                        .createIntent(context, permissions)
                    activity.runOnUiThread { startActivityForResult(call, intent, "permsResult") }
                    return@launch
                }
                writeWorkout(hc, call)
            } catch (e: Exception) {
                call.reject("logWorkout failed: ${e.message}")
            }
        }
    }

    @ActivityCallback
    private fun permsResult(call: PluginCall?, @Suppress("UNUSED_PARAMETER") result: ActivityResult) {
        if (call == null) return
        val hc = client() ?: run { call.reject("Health Connect not available"); return }
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (!granted.containsAll(permissions)) { call.reject("permission denied"); return@launch }
                writeWorkout(hc, call)
            } catch (e: Exception) {
                call.reject("logWorkout failed: ${e.message}")
            }
        }
    }

    private suspend fun writeWorkout(hc: HealthConnectClient, call: PluginCall) {
        val startStr = call.getString("start") ?: run { call.reject("missing 'start'"); return }
        val start = Instant.parse(startStr)
        val durationSec = (call.getDouble("durationSec") ?: 1.0).coerceAtLeast(1.0)
        val kcal = (call.getDouble("kcal") ?: 0.0).coerceAtLeast(0.0)
        val type = call.getString("type") ?: "other"
        val title = call.getString("name") ?: "BreakFit"
        val end = start.plusSeconds(durationSec.toLong())
        val zone = ZoneOffset.UTC

        val exerciseType = if (type == "strength_training")
            ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
        else
            ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT

        val records = mutableListOf<Record>(
            ExerciseSessionRecord(
                startTime = start, startZoneOffset = zone,
                endTime = end, endZoneOffset = zone,
                exerciseType = exerciseType,
                title = title,
            ),
        )
        if (kcal > 0) {
            records.add(
                ActiveCaloriesBurnedRecord(
                    startTime = start, startZoneOffset = zone,
                    endTime = end, endZoneOffset = zone,
                    energy = Energy.kilocalories(kcal),
                ),
            )
        }
        hc.insertRecords(records)
        call.resolve()
    }
}

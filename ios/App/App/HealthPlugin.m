#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift HealthPlugin with Capacitor under the JS name "Health".
// Place at: ios/App/App/HealthPlugin.m
CAP_PLUGIN(HealthPlugin, "Health",
  CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(logWorkout, CAPPluginReturnPromise);
)

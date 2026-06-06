import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the BreakFit native shell.
 * `webDir` points at the Angular production build output.
 *
 * NOTE: this file is only read by the Capacitor CLI (`npx cap …`); it is not
 * part of the Angular build (tsconfig.app includes src/** only).
 */
const config: CapacitorConfig = {
  appId: 'app.breakfit',
  appName: 'BreakFit',
  webDir: 'dist/breakfit/browser',
  backgroundColor: '#0a0a0a',
  ios: {
    contentInset: 'always',
  },
  android: {
    // keep cleartext OFF in committed config; enable only for LAN dev if needed
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
    },
  },
};

export default config;

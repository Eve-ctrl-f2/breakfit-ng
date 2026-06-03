import type { Environment } from './environment.type';

export const environment: Environment = {
  production: false,
  appVersion: '2.0.0-dev',
  buildDate: new Date().toISOString(),
  // Feature flag — mirrors the React build's VITE_CLOUD_ENABLED.
  // When false the whole auth/cloud-sync surface is disabled and the app is local-only.
  cloudEnabled: false,
  apiBase: 'http://localhost:8080',
  feedbackEmail: 'feedback@breakfit.app',
  sentryDsn: '',
  vapidPublicKey: '',
};

import type { Environment } from './environment.type';

export const environment: Environment = {
  production: true,
  appVersion: '2.0.0',
  buildDate: new Date().toISOString(),
  cloudEnabled: true,  // live-test: cloud + push on
  apiBase: '', // same-origin: served behind the nginx 'web' service / tunnel (web + PWA)
  nativeApiBase: '', // native (Capacitor) only: emulator http://10.0.2.2:8080, device LAN IP, store = your HTTPS API
  feedbackEmail: 'feedback@breakfit.app',
  sentryDsn: '',
  vapidPublicKey: 'BPFPNZkYU7G7xZPmgacaF70af5aLBB2L7BnIMwKeAcuZ6HyBHdTDOrmVlc1pAWVCom5gAfPybCEhGY8lXkhogVY',
};

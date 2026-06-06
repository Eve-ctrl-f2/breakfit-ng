import type { Environment } from './environment.type';

export const environment: Environment = {
  production: true,
  appVersion: '2.0.0',
  buildDate: new Date().toISOString(),
  cloudEnabled: true,  // live-test: cloud + push on
  apiBase: '',  // same-origin: served behind the nginx 'web' service (and the tunnel). For a split deploy, set the API's HTTPS URL.
  feedbackEmail: 'feedback@breakfit.app',
  sentryDsn: '',
  vapidPublicKey: 'BPFPNZkYU7G7xZPmgacaF70af5aLBB2L7BnIMwKeAcuZ6HyBHdTDOrmVlc1pAWVCom5gAfPybCEhGY8lXkhogVY',
};

import type { Environment } from './environment.type';

export const environment: Environment = {
  production: true,
  appVersion: '2.0.0',
  buildDate: new Date().toISOString(),
  cloudEnabled: true,  // live-test: cloud + push on
  apiBase: 'http://localhost:8080',  // local live-test; for a real deploy set your HTTPS API URL
  feedbackEmail: 'feedback@breakfit.app',
  sentryDsn: '',
  vapidPublicKey: 'BPFPNZkYU7G7xZPmgacaF70af5aLBB2L7BnIMwKeAcuZ6HyBHdTDOrmVlc1pAWVCom5gAfPybCEhGY8lXkhogVY',
};

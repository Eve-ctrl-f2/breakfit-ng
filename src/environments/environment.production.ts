import type { Environment } from './environment.type';

export const environment: Environment = {
  production: true,
  appVersion: '2.0.0',
  buildDate: new Date().toISOString(),
  cloudEnabled: true,  // live-test: cloud + push on
  apiBase: 'https://REPLACE-WITH-YOUR-API-URL',  // <-- set to your deployed API
  feedbackEmail: 'feedback@breakfit.app',
  sentryDsn: '',
  vapidPublicKey: 'BMAOhEylKMI5mJSyFYV6nX9eHwScqK1inkBJQJyAy0MytJGN7eWWNz-otvHJa5aGNL6sbutIole8iGBSAZjA15A',
};

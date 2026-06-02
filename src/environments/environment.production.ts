import type { Environment } from './environment.type';

export const environment: Environment = {
  production: true,
  appVersion: '2.0.0',
  buildDate: new Date().toISOString(),
  cloudEnabled: false,
  apiBase: 'https://api.breakfit.app',
  feedbackEmail: 'feedback@breakfit.app',
};

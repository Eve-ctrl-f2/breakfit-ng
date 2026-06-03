export interface Environment {
  production: boolean;
  appVersion: string;
  buildDate: string;
  cloudEnabled: boolean;
  apiBase: string;
  feedbackEmail: string;
  /** optional crash-reporting endpoint / Sentry DSN; empty = disabled */
  sentryDsn: string;
  /** VAPID public key for Web Push; empty = push disabled */
  vapidPublicKey: string;
}

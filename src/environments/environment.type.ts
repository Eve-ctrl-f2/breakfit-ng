export interface Environment {
  production: boolean;
  appVersion: string;
  buildDate: string;
  cloudEnabled: boolean;
  /** API base for the web/PWA build. '' = same-origin (served behind the nginx 'web' service / tunnel). */
  apiBase: string;
  /** Absolute API base used only inside the native (Capacitor) shell, where relative URLs hit the in-app origin. */
  nativeApiBase: string;
  feedbackEmail: string;
  /** optional crash-reporting endpoint / Sentry DSN; empty = disabled */
  sentryDsn: string;
  /** VAPID public key for Web Push; empty = push disabled */
  vapidPublicKey: string;
}

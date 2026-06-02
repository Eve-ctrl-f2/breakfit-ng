import { Routes } from '@angular/router';
import { environment } from '@env/environment';

/**
 * Lazy, standalone-component routes. When cloud is disabled the /auth/* routes
 * are not registered at all and anything under them redirects to /timer
 * (mirrors the React build: "auth routes redirect to /timer when cloud off").
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'timer' },
  {
    path: 'timer',
    loadComponent: () =>
      import('./features/timer/timer-page.component').then((m) => m.TimerPageComponent),
  },
  {
    path: 'insights',
    loadComponent: () =>
      import('./features/insights/insights-page.component').then((m) => m.InsightsPageComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings-page.component').then((m) => m.SettingsPageComponent),
  },
  ...(environment.cloudEnabled
    ? [
        {
          path: 'auth/login',
          loadComponent: () =>
            import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
        },
        {
          path: 'auth/verify',
          loadComponent: () =>
            import('./features/auth/verify-page.component').then((m) => m.VerifyPageComponent),
        },
      ]
    : [{ path: 'auth/:rest', redirectTo: 'timer' }]),
  { path: '**', redirectTo: 'timer' },
];

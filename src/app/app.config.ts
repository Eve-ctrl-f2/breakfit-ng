import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  provideAppInitializer,
  inject,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { BreakFitPreset } from './theme/breakfit-preset';
import { apiInterceptor, errorInterceptor } from './core/api/interceptors';
import { AuthService } from './core/api/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21: zoneless change detection is the default for new projects.
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: BreakFitPreset,
        options: {
          // permanent dark mode — the dark token set is always active
          darkModeSelector: '.dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      ripple: true,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Restore the session (no-op when cloud disabled) before the app renders.
    provideAppInitializer(() => inject(AuthService).loadMe()),
  ],
};

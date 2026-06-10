import {
  ApplicationConfig,
  ErrorHandler,
  provideZonelessChangeDetection,
  provideAppInitializer,
  inject,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { BreakFitPreset } from './theme/breakfit-preset';
import { apiInterceptor, errorInterceptor } from './core/api/interceptors';
import { AuthService } from './core/api/auth.service';
import { SyncService } from './core/api/sync.service';
import { PlatformService } from './core/services/platform.service';
import { ThemeService } from './core/services/theme.service';
import { AppUpdateService } from './core/services/app-update.service';
import { GlobalErrorHandler } from './core/error/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21: zoneless change detection is the default for new projects.
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      // Lazy routes load on demand, then preload the rest in the background once
      // the initial route is stable — first paint stays small, later nav is instant.
      withPreloading(PreloadAllModules),
    ),
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
    // App bootstrap: restore session (no-op when cloud disabled), construct the
    // platform-capability service (attaches the install-prompt listener early),
    // and start cross-platform auto-sync.
    provideAppInitializer(() => {
      inject(PlatformService); // eager — must catch beforeinstallprompt
      inject(ThemeService); // eager — apply theme/accent before first paint
      inject(AppUpdateService).init(); // watch for new SW versions, prompt reload
      inject(SyncService).enableAutoSync();
      const auth = inject(AuthService);
      const sync = inject(SyncService);
      // rotate token, load user, then reconcile settings across devices
      return auth.refresh().then(() => auth.loadMe()).then(() => sync.syncSettings());
    }),
    // Global crash reporting — forwards uncaught errors to the reporting seam.
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};

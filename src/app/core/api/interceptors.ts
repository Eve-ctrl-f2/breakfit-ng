import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { isNativePlatform } from '../native/native-bridge';
import { AuthService } from './auth.service';

/** Prefix relative URLs with the API base + version, and attach the bearer token. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAbsolute = /^https?:\/\//i.test(req.url);
  // In the native shell, relative URLs resolve against the in-app origin, so use
  // the absolute nativeApiBase there; on web, '' keeps everything same-origin.
  const base = isNativePlatform() ? environment.nativeApiBase : environment.apiBase;
  const url = isAbsolute ? req.url : `${base}/v1${req.url}`;
  const token = auth.token();
  const headers = token ? req.headers.set('Authorization', `Bearer ${token}`) : req.headers;
  return next(req.clone({ url, headers }));
};

/** Normalize errors and auto-logout on 401. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) auth.logout();
      const message =
        err.error?.message ?? err.message ?? 'Unerwarteter Fehler. Bitte erneut versuchen.';
      return throwError(() => ({ status: err.status, message }));
    }),
  );
};

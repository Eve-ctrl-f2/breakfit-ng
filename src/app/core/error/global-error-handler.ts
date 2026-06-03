import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorReportingService } from '../api/error-reporting.service';

/**
 * GlobalErrorHandler — replaces Angular's default ErrorHandler. Forwards every
 * uncaught error to the reporting service, then preserves the default console
 * output so local debugging is unaffected. Must be resilient: a throw in here
 * would break Angular's error pipeline, so the reporting call is defensive.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private reporter = inject(ErrorReportingService);

  handleError(error: unknown): void {
    try {
      this.reporter.report(error);
    } catch {
      /* swallow — never let error handling throw */
    }
    console.error(error);
  }
}

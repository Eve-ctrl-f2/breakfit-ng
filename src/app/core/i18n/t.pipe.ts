import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * Translate pipe: `{{ 'settings.title' | t }}` / `{{ 'timer.hint' | t:{focus:25,break:5} }}`.
 *
 * Marked `pure: false` on purpose: a pure pipe memoizes on its input args, so
 * it would not re-run when only the locale signal changes. As an impure pipe it
 * is invoked each change-detection pass, and because `t()` reads the locale
 * signal inside the template's reactive context, a locale switch marks the view
 * dirty and the new string is produced. For an app this size the cost is
 * negligible.
 */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private i18n = inject(TranslationService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

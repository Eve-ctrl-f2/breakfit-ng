import { Injectable, effect, inject } from '@angular/core';
import { SettingsService } from './settings.service';

/**
 * ThemeService — reflects the user's appearance settings onto <html>:
 *   - `.dark` class drives PrimeNG's dark design tokens (darkModeSelector)
 *   - `.theme-light` overrides our CSS custom properties for light mode
 *   - `data-accent` selects the accent palette
 *
 * "system" follows `prefers-color-scheme` live. Instantiated at boot so the
 * theme is applied before first paint.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private settings = inject(SettingsService);
  private mql = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  constructor() {
    // re-apply when the OS scheme changes (only matters in "system" mode)
    this.mql?.addEventListener?.('change', () => this.apply());
    effect(() => {
      const s = this.settings.settings();
      this.apply(s.theme, s.accent);
    });
  }

  private apply(theme = this.settings.settings().theme, accent = this.settings.settings().accent): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const dark = theme === 'dark' || (theme === 'system' && (this.mql?.matches ?? true));
    root.classList.toggle('dark', dark);
    root.classList.toggle('theme-light', !dark);
    root.setAttribute('data-accent', accent ?? 'lime');
  }
}

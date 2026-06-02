import { Injectable, signal } from '@angular/core';
import { translations, SUPPORTED_LOCALES, type Locale } from './translations';

const STORAGE_KEY = 'bf_lang';
const FALLBACK: Locale = 'de';

/**
 * TranslationService — the lightweight i18n runtime (no ngx-translate; for two
 * locales a 50-line custom layer is leaner). Locale is a signal, so any
 * template that resolves a string through the `t` pipe re-renders on change.
 *
 *   t('settings.title')                         -> "Einstellungen"
 *   t('timer.hint', { focus: 25, break: 5 })    -> interpolated
 *   t('common.day', { count: 3 })               -> plural via _one/_other
 *
 * Missing-key fallback order: current locale -> DE catalog -> raw key (the raw
 * key stays visible as a signal that something is untranslated).
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly locale = signal<Locale>(this.initialLocale());
  readonly supported = SUPPORTED_LOCALES;

  constructor() {
    this.syncHtmlLang(this.locale());
  }

  setLocale(locale: Locale): void {
    this.locale.set(locale);
    localStorage.setItem(STORAGE_KEY, locale);
    this.syncHtmlLang(locale);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const loc = this.locale();
    const resolvedKey = this.resolvePlural(key, loc, params);
    const table = translations[loc];
    const value =
      table[resolvedKey] ??
      translations[FALLBACK][resolvedKey] ??
      table[key] ??
      translations[FALLBACK][key] ??
      key;
    return params ? interpolate(value, params) : value;
  }

  private resolvePlural(
    key: string,
    loc: Locale,
    params?: Record<string, string | number>,
  ): string {
    if (!params || typeof params['count'] !== 'number') return key;
    const count = params['count'] as number;
    const suffix = count === 1 ? '_one' : '_other';
    const pluralKey = `${key}${suffix}`;
    return pluralKey in translations[loc] || pluralKey in translations[FALLBACK]
      ? pluralKey
      : key;
  }

  private initialLocale(): Locale {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && (stored === 'de' || stored === 'en')) return stored;
    const nav = (navigator.language || '').slice(0, 2);
    return nav === 'en' ? 'en' : FALLBACK;
  }

  private syncHtmlLang(loc: Locale): void {
    document.documentElement.setAttribute('lang', loc);
  }
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  );
}

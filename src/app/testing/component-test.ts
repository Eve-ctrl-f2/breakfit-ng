import { Provider, Type, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from '@core/i18n/translation.service';

/** Minimal TranslationService stub: echoes the key so the `| t` pipe renders. */
export function provideI18nStub(): Provider {
  return { provide: TranslationService, useValue: { t: (key: string) => key } };
}

/**
 * Stand a standalone component up in TestBed with the given (usually stubbed)
 * providers plus a zoneless change detector and the i18n stub. Returns the
 * fixture and its host element after a first change-detection pass.
 */
export function renderWith<T>(
  component: Type<T>,
  providers: Provider[] = [],
  opts: { detect?: boolean } = {},
) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), provideI18nStub(), ...providers],
  });
  const fixture = TestBed.createComponent(component);
  if (opts.detect !== false) fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, instance: fixture.componentInstance };
}

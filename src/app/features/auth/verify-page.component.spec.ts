import { Router } from '@angular/router';
import { renderWith } from '../../testing/component-test';
import { VerifyPageComponent } from './verify-page.component';
import { AuthService } from '@core/api/auth.service';

describe('VerifyPageComponent', () => {
  it('renders the code form', () => {
    const { el, instance } = renderWith(VerifyPageComponent, [
      { provide: AuthService, useValue: { verify: async () => undefined, pendingEmail: () => 'a@b.de' } },
      { provide: Router, useValue: { navigate: async () => true } },
    ]);
    expect(instance).toBeTruthy();
    expect(el.querySelector('input')).toBeTruthy();
  });
});

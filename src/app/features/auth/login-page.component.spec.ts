import { Router } from '@angular/router';
import { renderWith } from '../../testing/component-test';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '@core/api/auth.service';

describe('LoginPageComponent', () => {
  it('renders the email form', () => {
    const { el, instance } = renderWith(LoginPageComponent, [
      { provide: AuthService, useValue: { requestCode: async () => undefined } },
      { provide: Router, useValue: { navigate: async () => true } },
    ]);
    expect(instance).toBeTruthy();
    expect(el.querySelector('input')).toBeTruthy();
  });
});

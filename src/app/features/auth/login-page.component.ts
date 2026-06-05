import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/api/auth.service';
import { TranslationService } from '@core/i18n/translation.service';
import { TPipe } from '@core/i18n/t.pipe';
import { environment } from '@env/environment';

@Component({
  selector: 'bf-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule, ButtonModule, MessageModule, TPipe],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private i18n = inject(TranslationService);

  readonly email = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly devHint = !environment.production;

  async submit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.requestCode(this.email());
      await this.router.navigate(['/auth/verify'], { queryParams: { email: this.email() } });
    } catch (e: unknown) {
      this.error.set((e instanceof Error ? e.message : undefined) ?? this.i18n.t('auth.error.login'));
    } finally {
      this.loading.set(false);
    }
  }
}

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/api/auth.service';
import { TranslationService } from '@core/i18n/translation.service';
import { TPipe } from '@core/i18n/t.pipe';

@Component({
  selector: 'bf-verify-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputOtpModule, MessageModule, TPipe],
  templateUrl: './verify-page.component.html',
  styleUrl: './verify-page.component.scss',
})
export class VerifyPageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private i18n = inject(TranslationService);

  /** bound from ?email= via withComponentInputBinding() */
  readonly email = input('');
  readonly code = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.verify(this.email(), this.code());
      await this.router.navigate(['/timer']);
    } catch (e: unknown) {
      this.error.set((e instanceof Error ? e.message : undefined) ?? this.i18n.t('auth.error.code'));
    } finally {
      this.loading.set(false);
    }
  }
}

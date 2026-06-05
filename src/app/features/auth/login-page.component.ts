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
  template: `
    <section class="container auth">
      <h1 class="auth__title mono">BreakFit</h1>
      <p class="muted auth__sub">{{ 'auth.login.sub' | t }}</p>

      <label class="auth__field">
        <span class="muted">{{ 'auth.email' | t }}</span>
        <input pInputText type="email" [(ngModel)]="email" placeholder="du@example.com"
               autocomplete="email" />
      </label>

      @if (error()) { <p-message severity="error">{{ error() }}</p-message> }

      <p-button [label]="'auth.requestCode' | t" icon="pi pi-envelope" [loading]="loading()"
                [disabled]="!email()" (onClick)="submit()" styleClass="auth__btn" />

      @if (devHint) {
        <p class="muted auth__hint">{{ 'auth.devHint' | t }}</p>
      } @else {
        <p class="muted auth__hint">{{ 'auth.spamHint' | t }}</p>
      }
    </section>
  `,
  styles: [`
    .auth { max-width: 380px; padding-top: var(--s-6); display: flex; flex-direction: column; gap: var(--s-3); }
    .auth__title { font-size: 2rem; margin: 0; }
    .auth__sub { margin: 0 0 var(--s-2); }
    .auth__field { display: flex; flex-direction: column; gap: 6px; }
    .auth__field input { width: 100%; }
    :host ::ng-deep .auth__btn .p-button { width: 100%; }
    .auth__hint { font-size: 0.8rem; text-align: center; }
  `],
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

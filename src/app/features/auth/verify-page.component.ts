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
  template: `
    <section class="container auth">
      <h1 class="auth__title mono">{{ 'auth.verify.title' | t }}</h1>
      <p class="muted auth__sub">{{ 'auth.verify.sub' | t:{ email: email() } }}</p>

      <p-inputotp [(ngModel)]="code" [length]="6" [integerOnly]="true" />

      @if (error()) { <p-message severity="error">{{ error() }}</p-message> }

      <p-button [label]="'auth.confirm' | t" icon="pi pi-check" [loading]="loading()"
                [disabled]="code().length < 6" (onClick)="submit()" styleClass="auth__btn" />
    </section>
  `,
  styles: [`
    .auth { max-width: 380px; padding-top: var(--s-6); display: flex; flex-direction: column; gap: var(--s-3); align-items: center; }
    .auth__title { font-size: 1.6rem; margin: 0; }
    .auth__sub { margin: 0 0 var(--s-2); text-align: center; }
    :host ::ng-deep .auth__btn .p-button { width: 100%; }
  `],
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

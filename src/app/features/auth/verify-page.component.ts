import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@core/api/auth.service';

@Component({
  selector: 'bf-verify-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputOtpModule, MessageModule],
  template: `
    <section class="container auth">
      <h1 class="auth__title mono">Code eingeben</h1>
      <p class="muted auth__sub">Wir haben einen Code an {{ email() }} gesendet.</p>

      <p-inputotp [(ngModel)]="code" [length]="6" [integerOnly]="true" />

      @if (error()) { <p-message severity="error">{{ error() }}</p-message> }

      <p-button label="Bestätigen" icon="pi pi-check" [loading]="loading()"
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
    } catch (e: any) {
      this.error.set(e?.message ?? 'Code ungültig.');
    } finally {
      this.loading.set(false);
    }
  }
}

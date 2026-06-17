import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiToastService } from '@core/services/ui-toast.service';

@Component({
  selector: 'bf-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.current(); as t) {
      <div class="toast" role="status" aria-live="polite">
        <span class="toast__msg">{{ t.message }}</span>
        @if (t.actionLabel) {
          <button type="button" class="toast__action" (click)="toast.runAction()">
            {{ t.actionLabel }}
          </button>
        }
        <button type="button" class="toast__close" (click)="toast.dismiss()" aria-label="Dismiss">
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
      </div>
    }
  `,
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  protected readonly toast = inject(UiToastService);
}

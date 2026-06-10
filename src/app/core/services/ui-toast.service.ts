import { Injectable, signal } from '@angular/core';

export interface ToastData {
  message: string;
  actionLabel?: string;
  action?: () => void;
}

/**
 * Minimal snackbar/toast: one transient message at a time, with an optional
 * action (e.g. "Undo"). Signal-based; rendered by <bf-toast> in the app shell.
 */
@Injectable({ providedIn: 'root' })
export class UiToastService {
  readonly current = signal<ToastData | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(data: ToastData, durationMs = 6000): void {
    if (this.timer) clearTimeout(this.timer);
    this.current.set(data);
    // durationMs <= 0 => sticky (stays until acted on/dismissed); used by the
    // "new version available" prompt so it can't time out before a reload.
    this.timer = durationMs > 0 ? setTimeout(() => this.dismiss(), durationMs) : null;
  }

  runAction(): void {
    const a = this.current()?.action;
    this.dismiss();
    a?.();
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.current.set(null);
  }
}

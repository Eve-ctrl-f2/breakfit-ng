import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { PresetService } from '@core/services/preset.service';
import { TranslationService } from '@core/i18n/translation.service';
import { TPipe } from '@core/i18n/t.pipe';
import type { FocusPreset } from '@core/services/preset.service';

@Component({
  selector: 'bf-preset-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, CardModule, InputTextModule, TagModule, TPipe],
  template: `
    <div class="presets">
      @for (p of presets.all(); track p.id) {
        <div class="preset" [class.preset--custom]="p.custom">
          <div class="preset__info">
            <span class="preset__name">{{ p.name }}</span>
            <span class="preset__meta muted">
              {{ p.focusMinutes }}/{{ p.breakMinutes }} min
            </span>
          </div>
          <div class="preset__acts">
            <p-button [label]="'presets.apply' | t" size="small" [outlined]="true"
                      (onClick)="apply(p)" />
            @if (p.custom) {
              <button class="preset__del" (click)="presets.delete(p.id)"
                      [attr.aria-label]="'common.delete' | t">
                <i class="pi pi-trash"></i>
              </button>
            }
          </div>
        </div>
      }

      <!-- save current settings as custom preset -->
      @if (!saving()) {
        <p-button [label]="'presets.saveCurrentBtn' | t" icon="pi pi-bookmark"
                  [text]="true" size="small" (onClick)="saving.set(true)" />
      } @else {
        <div class="preset-save">
          <input pInputText [(ngModel)]="saveName"
                 [placeholder]="'presets.namePlaceholder' | t" maxlength="40" />
          <p-button [label]="'common.save' | t" size="small" icon="pi pi-check"
                    [disabled]="!saveName.trim()" (onClick)="savePreset()" />
          <p-button [label]="'common.cancel' | t" size="small" severity="secondary"
                    [outlined]="true" (onClick)="saving.set(false)" />
        </div>
      }
    </div>
  `,
  styles: [`
    .presets { display: flex; flex-direction: column; gap: var(--s-2); }
    .preset { display: flex; align-items: center; gap: var(--s-2); padding: 10px 0;
              border-bottom: 1px solid var(--border-1); }
    .preset:last-of-type { border-bottom: none; }
    .preset__info { flex: 1 1 auto; }
    .preset__name { display: block; font-size: 0.92rem; color: var(--text-1); }
    .preset__meta { font-size: 0.78rem; }
    .preset__acts { display: flex; align-items: center; gap: var(--s-2); }
    .preset--custom .preset__name { color: var(--accent); }
    .preset__del { background: none; border: none; cursor: pointer; color: var(--text-3);
                   padding: 4px; border-radius: 6px; display: flex; }
    .preset__del:hover { color: var(--danger); background: rgba(240,104,104,0.1); }
    .preset-save { display: flex; gap: var(--s-2); align-items: center; flex-wrap: wrap; }
    .preset-save input { flex: 1 1 140px; background: var(--surface-2); color: var(--text-1);
                         border: 1px solid var(--border-2); border-radius: 10px; padding: 8px 12px; }
    .preset-save input:focus { outline: none; border-color: var(--accent); }
  `],
})
export class PresetCardComponent {
  readonly presets = inject(PresetService);
  private i18n = inject(TranslationService);

  readonly saving = signal(false);
  saveName = '';

  apply(p: FocusPreset): void {
    this.presets.apply(p);
  }

  savePreset(): void {
    if (!this.saveName.trim()) return;
    this.presets.save(this.saveName);
    this.saveName = '';
    this.saving.set(false);
  }
}

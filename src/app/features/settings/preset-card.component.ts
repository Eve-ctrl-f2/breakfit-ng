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
  templateUrl: './preset-card.component.html',
  styleUrl: './preset-card.component.scss',
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

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputNumberModule } from 'primeng/inputnumber';
import { ExercisePoolService } from '@core/services/exercise-pool.service';
import { TranslationService } from '@core/i18n/translation.service';
import { TPipe } from '@core/i18n/t.pipe';
import type { ExerciseCategory, Difficulty } from '@core/models/models';
import { CATEGORY_LABELS } from '@core/data/exercises.data';

interface Form {
  name: string;
  category: ExerciseCategory;
  difficulty: Difficulty;
  unit: 'reps' | 'seconds';
  defaultAmount: number;
}

const EMPTY_FORM: Form = {
  name: '',
  category: 'kraft',
  difficulty: 'mittel',
  unit: 'reps',
  defaultAmount: 10,
};

/**
 * CustomExerciseFormComponent — collapsible form to add user-defined exercises.
 *
 * Validation rules (applied before submit):
 *  - name: required, trimmed length 1–40
 *  - defaultAmount: integer ≥ 1
 *  - max 20 custom exercises (soft guard; ExercisePoolService doesn't enforce this)
 *
 * Architecture: form state is local signal — not pushed to the service until
 * valid submit. Cancel resets without touching the pool.
 */
@Component({
  selector: 'bf-custom-exercise-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectButtonModule, InputNumberModule, TPipe],
  template: `
    @if (!open()) {
      <p-button
        [label]="'exercises.addBtn' | t"
        icon="pi pi-plus"
        [outlined]="true"
        size="small"
        (onClick)="open.set(true)"
      />
    } @else {
      <div class="exf">
        <p class="set__h">{{ 'exercises.addTitle' | t }}</p>

        <!-- Name -->
        <label class="exf__row">
          <span class="exf__lbl">{{ 'exercises.name' | t }}</span>
          <input pInputText [(ngModel)]="form().name" (ngModelChange)="patch({ name: $event })"
                 [placeholder]="'exercises.namePlaceholder' | t" maxlength="40" />
        </label>

        <!-- Category -->
        <label class="exf__row">
          <span class="exf__lbl">{{ 'exercises.category' | t }}</span>
          <p-selectbutton [options]="catOptions" optionLabel="label" optionValue="value"
                          [allowEmpty]="false"
                          [ngModel]="form().category"
                          (ngModelChange)="patch({ category: $event })" />
        </label>

        <!-- Difficulty -->
        <label class="exf__row">
          <span class="exf__lbl">{{ 'exercises.difficulty' | t }}</span>
          <p-selectbutton [options]="diffOptions" optionLabel="label" optionValue="value"
                          [allowEmpty]="false"
                          [ngModel]="form().difficulty"
                          (ngModelChange)="patch({ difficulty: $event })" />
        </label>

        <!-- Unit -->
        <label class="exf__row">
          <span class="exf__lbl">{{ 'exercises.unit' | t }}</span>
          <p-selectbutton [options]="unitOptions" optionLabel="label" optionValue="value"
                          [allowEmpty]="false"
                          [ngModel]="form().unit"
                          (ngModelChange)="patch({ unit: $event })" />
        </label>

        <!-- Default amount -->
        <label class="exf__row">
          <span class="exf__lbl">{{ 'exercises.amount' | t }}</span>
          <p-inputnumber [ngModel]="form().defaultAmount"
                         (ngModelChange)="patch({ defaultAmount: $event ?? 1 })"
                         [min]="1" [max]="999" [showButtons]="true" inputStyleClass="exf__num" />
        </label>

        @if (error()) { <p class="exf__err">{{ error() }}</p> }

        <div class="exf__actions">
          <p-button [label]="'common.cancel' | t" severity="secondary" [outlined]="true"
                    size="small" (onClick)="cancel()" />
          <p-button [label]="'common.save' | t" icon="pi pi-check"
                    size="small" (onClick)="submit()" />
        </div>
      </div>
    }

    <!-- custom exercises list with delete -->
    @if (pool.all().some(e => e.custom)) {
      <div class="custom-list">
        @for (ex of pool.all(); track ex.id) {
          @if (ex.custom) {
            <div class="custom-item">
              <span class="custom-item__dot" [style.background]="catColors[ex.category]"></span>
              <span class="custom-item__name">{{ ex.name }}</span>
              <span class="muted custom-item__meta">{{ ex.defaultAmount }} {{ ex.unit === 'reps' ? ('exercises.reps' | t) : ('exercises.seconds' | t) }}</span>
              <button class="custom-item__del" (click)="pool.removeCustom(ex.id)" [attr.aria-label]="'common.delete' | t">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          }
        }
      </div>
    }
  `,
  styles: [`
    .exf { background: var(--surface-1); border: 1px solid var(--border-2); border-radius: var(--radius);
           padding: var(--s-3); display: flex; flex-direction: column; gap: var(--s-3); margin-top: var(--s-2); }
    .set__h { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-2); margin: 0; }
    .exf__row { display: flex; flex-direction: column; gap: 6px; }
    .exf__lbl { font-size: 0.8rem; color: var(--text-2); }
    .exf__row input { width: 100%; background: var(--surface-2); color: var(--text-1);
                      border: 1px solid var(--border-2); border-radius: 10px; padding: 8px 12px; }
    .exf__row input:focus { outline: none; border-color: var(--accent); }
    :host ::ng-deep .exf__num { width: 80px; }
    .exf__actions { display: flex; gap: var(--s-2); justify-content: flex-end; }
    .exf__err { color: var(--danger); font-size: 0.82rem; margin: 0; }

    .custom-list { margin-top: var(--s-3); display: flex; flex-direction: column; gap: 2px; }
    .custom-item { display: flex; align-items: center; gap: var(--s-2); padding: 8px 0;
                   border-bottom: 1px solid var(--border-1); }
    .custom-item:last-child { border-bottom: none; }
    .custom-item__dot { width: 6px; height: 24px; border-radius: 3px; flex: 0 0 auto; }
    .custom-item__name { flex: 1 1 auto; font-size: 0.9rem; color: var(--text-1); }
    .custom-item__meta { font-size: 0.78rem; }
    .custom-item__del { background: none; border: none; cursor: pointer; color: var(--text-3);
                        padding: 4px; border-radius: 6px; display: flex; }
    .custom-item__del:hover { color: var(--danger); background: rgba(240,104,104,0.1); }
  `],
})
export class CustomExerciseFormComponent {
  readonly pool = inject(ExercisePoolService);
  private i18n = inject(TranslationService);

  readonly open = signal(false);
  readonly error = signal<string | null>(null);

  private readonly _form = signal<Form>({ ...EMPTY_FORM });
  readonly form = this._form.asReadonly();

  readonly catColors: Record<ExerciseCategory, string> = {
    kraft: 'var(--cat-kraft)', cardio: 'var(--cat-cardio)', core: 'var(--cat-core)',
    dehnen: 'var(--cat-dehnen)', schultern: 'var(--cat-schultern)',
    ruecken: 'var(--cat-ruecken)', beine: 'var(--cat-beine)',
  };

  readonly catOptions = Object.entries(CATEGORY_LABELS).map(([v, l]) => ({
    label: l,
    value: v as ExerciseCategory,
  }));

  get diffOptions() {
    return [
      { label: this.i18n.t('settings.diff.leicht'), value: 'leicht' as Difficulty },
      { label: this.i18n.t('settings.diff.mittel'), value: 'mittel' as Difficulty },
      { label: this.i18n.t('settings.diff.fortgeschritten'), value: 'fortgeschritten' as Difficulty },
    ];
  }

  get unitOptions() {
    return [
      { label: this.i18n.t('exercises.reps'), value: 'reps' as const },
      { label: this.i18n.t('exercises.seconds'), value: 'seconds' as const },
    ];
  }

  patch(partial: Partial<Form>): void {
    this._form.update((f) => ({ ...f, ...partial }));
  }

  submit(): void {
    const f = this._form();
    const name = f.name.trim();
    if (!name) { this.error.set(this.i18n.t('exercises.errName')); return; }
    if (f.defaultAmount < 1) { this.error.set(this.i18n.t('exercises.errAmount')); return; }
    if (this.pool.all().filter((e) => e.custom).length >= 20) {
      this.error.set(this.i18n.t('exercises.errMax')); return;
    }
    this.pool.addCustom({
      name,
      category: f.category,
      difficulty: f.difficulty,
      unit: f.unit,
      defaultAmount: f.defaultAmount,
      intensity: 3,
      icon: 'pi-bolt',
    });
    this.cancel();
  }

  cancel(): void {
    this._form.set({ ...EMPTY_FORM });
    this.error.set(null);
    this.open.set(false);
  }
}

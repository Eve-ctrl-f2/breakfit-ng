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
  /** raw textarea text, one step per line; parsed to string[] on submit */
  instructions: string;
}

const EMPTY_FORM: Form = {
  name: '',
  category: 'kraft',
  difficulty: 'mittel',
  unit: 'reps',
  defaultAmount: 10,
  instructions: '',
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
        <p class="set__h">{{ (editId() ? 'exercises.editTitle' : 'exercises.addTitle') | t }}</p>

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

        <!-- Instructions (optional) -->
        <label class="exf__col">
          <span class="exf__lbl">{{ 'exercises.instructions' | t }}</span>
          <textarea rows="3" class="exf__area"
                    [ngModel]="form().instructions"
                    (ngModelChange)="patch({ instructions: $event })"
                    [placeholder]="'exercises.instructionsHint' | t"></textarea>
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
  `,
  styles: [`
    .exf { background: var(--surface-1); border: 1px solid var(--border-2); border-radius: var(--radius);
           padding: var(--s-3); display: flex; flex-direction: column; gap: var(--s-3); margin-top: var(--s-2); }
    .exf__col { display: flex; flex-direction: column; gap: var(--s-2); }
    .exf__area { width: 100%; resize: vertical; min-height: 64px; padding: 10px 12px;
                 background: var(--surface-2); color: var(--text-1);
                 border: 1px solid var(--border-2); border-radius: 10px; font: inherit; }
    .exf__area::placeholder { color: var(--text-3, var(--text-2)); }
    .set__h { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-2); margin: 0; }
    .exf__row { display: flex; flex-direction: column; gap: 6px; }
    .exf__lbl { font-size: 0.8rem; color: var(--text-2); }
    .exf__row input { width: 100%; background: var(--surface-2); color: var(--text-1);
                      border: 1px solid var(--border-2); border-radius: 10px; padding: 8px 12px; }
    .exf__row input:focus { outline: none; border-color: var(--accent); }
    :host ::ng-deep .exf__num { width: 80px; }
    .exf__actions { display: flex; gap: var(--s-2); justify-content: flex-end; }
    .exf__err { color: var(--danger); font-size: 0.82rem; margin: 0; }
  `],
})
export class CustomExerciseFormComponent {
  readonly pool = inject(ExercisePoolService);
  private i18n = inject(TranslationService);

  readonly open = signal(false);
  readonly error = signal<string | null>(null);
  readonly editId = signal<string | null>(null);

  private readonly _form = signal<Form>({ ...EMPTY_FORM });
  readonly form = this._form.asReadonly();

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

  /** open the form pre-filled to edit an existing custom exercise */
  editExercise(ex: { id: string; name: string; category: ExerciseCategory; difficulty: Difficulty; unit: 'reps' | 'seconds'; defaultAmount: number; instructions?: string[] }): void {
    this._form.set({
      name: ex.name,
      category: ex.category,
      difficulty: ex.difficulty,
      unit: ex.unit,
      defaultAmount: ex.defaultAmount,
      instructions: (ex.instructions ?? []).join('\n'),
    });
    this.editId.set(ex.id);
    this.error.set(null);
    this.open.set(true);
  }

  patch(partial: Partial<Form>): void {
    this._form.update((f) => ({ ...f, ...partial }));
  }

  /** textarea text -> trimmed, non-empty steps (undefined when none) */
  private parseInstructions(text: string): string[] | undefined {
    const steps = text.split('\n').map((s) => s.trim()).filter(Boolean);
    return steps.length ? steps : undefined;
  }

  submit(): void {
    const f = this._form();
    const name = f.name.trim();
    if (!name) { this.error.set(this.i18n.t('exercises.errName')); return; }
    if (f.defaultAmount < 1) { this.error.set(this.i18n.t('exercises.errAmount')); return; }

    const instructions = this.parseInstructions(f.instructions);
    const editing = this.editId();
    if (editing) {
      this.pool.updateCustom(editing, {
        name, category: f.category, difficulty: f.difficulty,
        unit: f.unit, defaultAmount: f.defaultAmount, instructions,
      });
    } else {
      if (this.pool.all().filter((e) => e.custom).length >= 20) {
        this.error.set(this.i18n.t('exercises.errMax')); return;
      }
      this.pool.addCustom({
        name, category: f.category, difficulty: f.difficulty,
        unit: f.unit, defaultAmount: f.defaultAmount, intensity: 3, icon: 'pi-bolt', instructions,
      });
    }
    this.cancel();
  }

  cancel(): void {
    this._form.set({ ...EMPTY_FORM });
    this.error.set(null);
    this.editId.set(null);
    this.open.set(false);
  }
}

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
  templateUrl: './custom-exercise-form.component.html',
  styleUrl: './custom-exercise-form.component.scss',
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

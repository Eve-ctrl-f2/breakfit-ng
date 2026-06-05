import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { GoalService } from '@core/services/goal.service';
import { TPipe } from '@core/i18n/t.pipe';

@Component({
  selector: 'bf-goal-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, ProgressBarModule, TPipe],
  templateUrl: './goal-card.component.html',
  styleUrl: './goal-card.component.scss',
})
export class GoalCardComponent {
  readonly goal = inject(GoalService);

  inc(): void { this.goal.setTarget(this.goal.weeklyTarget() + 1); }
  dec(): void { this.goal.setTarget(this.goal.weeklyTarget() - 1); }
}

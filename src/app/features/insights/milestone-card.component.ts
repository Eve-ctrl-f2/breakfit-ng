import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MilestoneService } from '@core/services/milestone.service';
import { TPipe } from '@core/i18n/t.pipe';

@Component({
  selector: 'bf-milestone-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  templateUrl: './milestone-card.component.html',
  styleUrl: './milestone-card.component.scss',
})
export class MilestoneCardComponent {
  readonly milestones = inject(MilestoneService);
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MilestoneService } from '@core/services/milestone.service';
import { TPipe } from '@core/i18n/t.pipe';

@Component({
  selector: 'bf-milestone-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <div class="ms">
      @for (m of milestones.milestones(); track m.id) {
        <div class="ms__badge" [class.ms__badge--earned]="m.earned"
             [attr.title]="(m.labelKey | t) + ' — ' + m.current + '/' + m.threshold">
          <div class="ms__icon"><i class="pi {{ m.icon }}"></i></div>
          <span class="ms__label">{{ m.labelKey | t }}</span>
          @if (!m.earned) {
            <div class="ms__track"><div class="ms__fill" [style.width.%]="m.progress * 100"></div></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ms { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: var(--s-2); }
    .ms__badge { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
                 padding: var(--s-3) var(--s-2); border-radius: 12px; background: var(--surface-1);
                 border: 1px solid var(--border-1); opacity: 0.55; transition: opacity .2s, border-color .2s; }
    .ms__badge--earned { opacity: 1; border-color: var(--accent-25); background: var(--accent-08); }
    .ms__icon { width: 38px; height: 38px; border-radius: 999px; display: grid; place-items: center;
                background: var(--surface-3); color: var(--text-3); font-size: 1.1rem; }
    .ms__badge--earned .ms__icon { background: var(--accent-15); color: var(--accent); }
    .ms__label { font-size: 0.72rem; color: var(--text-2); line-height: 1.2; }
    .ms__badge--earned .ms__label { color: var(--text-1); }
    .ms__track { width: 100%; height: 3px; background: var(--surface-3); border-radius: 999px; overflow: hidden; }
    .ms__fill { height: 100%; background: var(--accent-40); border-radius: 999px; }
  `],
})
export class MilestoneCardComponent {
  readonly milestones = inject(MilestoneService);
}

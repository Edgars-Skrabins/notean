import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {unreadBadgeLabel} from '@utils/unreadBadgeLabel';

@Component({
  selector: 'app-unread-badge',
  imports: [],
  templateUrl: './unread-badge.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './unread-badge.component.css'
})
export class UnreadBadgeComponent {
  @Input({required: true}) count!: number;
  @Input() dot = false;

  get label(): string {
    return unreadBadgeLabel(this.count);
  }
}

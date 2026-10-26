import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {IconComponent, IconName} from '@components/icon/icon.component';

@Component({
  selector: 'app-project-item-row',
  imports: [
    IconComponent
  ],
  templateUrl: './project-item-row.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './project-item-row.component.css'
})
export class ProjectItemRowComponent {
  @Input({required: true}) icon!: IconName;
  @Input({required: true}) title!: string;
  @Input() meta = '';
  @Output() opened = new EventEmitter<void>();
}

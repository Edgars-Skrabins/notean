import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {IconComponent, IconName} from "@components/icon/icon.component";

@Component({
  selector: 'app-button',
  imports: [
    NgIf,
    IconComponent
  ],
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './button.component.css'
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'ghost' | 'danger' = 'primary';
  @Input() icon?: IconName;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Output() pressed = new EventEmitter<void>();
}

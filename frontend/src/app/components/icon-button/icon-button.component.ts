import {Component, EventEmitter, Input, Output} from '@angular/core';
import {IconComponent, IconName} from "@components/icon/icon.component";

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [
    IconComponent
  ],
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.css'
})
export class IconButtonComponent {
  @Input({required: true}) icon!: IconName;
  @Input({required: true}) tooltip!: string;
  @Input() variant: 'ghost' | 'danger' = 'ghost';
  @Input() size: 28 | 36 = 36;
  @Input() disabled = false;
  @Output() pressed = new EventEmitter<void>();
}

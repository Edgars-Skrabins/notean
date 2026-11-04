import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'app-switch',
  imports: [],
  templateUrl: './switch.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './switch.component.css'
})
export class SwitchComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Output() checkedChange = new EventEmitter<boolean>();

  handleChange(checked: boolean) {
    this.checked = checked;
    this.checkedChange.emit(checked);
  }
}

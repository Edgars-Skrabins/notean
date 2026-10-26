import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'app-checkbox',
  imports: [],
  templateUrl: './checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './checkbox.component.css'
})
export class CheckboxComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Output() checkedChange = new EventEmitter<boolean>();

  handleChange(checked: boolean) {
    this.checked = checked;
    this.checkedChange.emit(checked);
  }
}

import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.css'
})
export class CheckboxComponent {
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  handleChange(checked: boolean) {
    this.checked = checked;
    this.checkedChange.emit(checked);
  }
}

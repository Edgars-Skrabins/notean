import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    ButtonComponent
  ],
  templateUrl: './confirm-delete-dialog.component.html',
  styleUrl: './confirm-delete-dialog.component.css'
})
export class ConfirmDeleteDialogComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) message!: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  handleConfirm() {
    this.confirmed.emit();
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

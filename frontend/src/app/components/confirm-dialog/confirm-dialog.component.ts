import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    ButtonComponent
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) message!: string;
  @Input() confirmLabel: string = PHRASES.DELETE;
  @Input() confirmVariant: 'primary' | 'ghost' | 'danger' = 'danger';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  handleConfirm() {
    this.confirmed.emit();
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

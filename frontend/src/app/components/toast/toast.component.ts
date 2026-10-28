import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {NgIf} from '@angular/common';
import {Toast, ToastAction, ToastType} from '@models/toast.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-toast',
  imports: [
    NgIf,
    TranslatePipe,
    IconButtonComponent
  ],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) toast!: Toast;
  @Output() closed = new EventEmitter<void>();

  act(action: ToastAction) {
    action.run();
    this.closed.emit();
  }

  get role(): 'alert' | 'status' {
    return this.toast.type === ToastType.ERROR ? 'alert' : 'status';
  }
}

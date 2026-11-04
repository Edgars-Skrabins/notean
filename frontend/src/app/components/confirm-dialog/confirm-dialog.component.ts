import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';
import {EscapeService} from '@services/escape.service';
import {uniqueId} from '@utils/uniqueId';

@Component({
  selector: 'app-confirm-dialog',
  imports: [
    CdkTrapFocus,
    TranslatePipe,
    ButtonComponent
  ],
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly messageId = uniqueId('confirmDialog');

  @Input({required: true}) message!: string;
  @Input() confirmLabel: string = PHRASES.DELETE;
  @Input() confirmVariant: 'primary' | 'ghost' | 'danger' = 'danger';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleCancel());
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  handleConfirm() {
    this.confirmed.emit();
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

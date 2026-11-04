import {Component, EventEmitter, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';
import {EscapeService} from '@services/escape.service';
import {uniqueId} from '@utils/uniqueId';

@Component({
  selector: 'app-edit-conflict-dialog',
  imports: [
    CdkTrapFocus,
    TranslatePipe,
    ButtonComponent
  ],
  templateUrl: './edit-conflict-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './edit-conflict-dialog.component.css'
})
export class EditConflictDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly messageId = uniqueId('editConflictDialog');

  @Output() loadLatest = new EventEmitter<void>();
  @Output() overwrite = new EventEmitter<void>();
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

  handleLoadLatest() {
    this.loadLatest.emit();
  }

  handleOverwrite() {
    this.overwrite.emit();
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

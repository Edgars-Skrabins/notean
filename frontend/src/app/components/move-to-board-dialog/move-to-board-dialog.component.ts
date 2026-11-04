import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {NgFor} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';
import {EscapeService} from '@services/escape.service';
import {uniqueId} from '@utils/uniqueId';

export interface MoveTargetColumn {
  id: number;
  title: string;
}

@Component({
  selector: 'app-move-to-board-dialog',
  imports: [
    CdkTrapFocus,
    NgFor,
    FormsModule,
    TranslatePipe,
    ButtonComponent
  ],
  templateUrl: './move-to-board-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './move-to-board-dialog.component.css'
})
export class MoveToBoardDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly titleId = uniqueId('moveToBoardDialog');

  @Input({required: true}) columns: MoveTargetColumn[] = [];
  @Output() moved = new EventEmitter<{ columnId: number }>();
  @Output() cancelled = new EventEmitter<void>();

  selectedColumnId: number | null = null;

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleCancel());
    this.selectedColumnId = this.columns[0]?.id ?? null;
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  handleMove() {
    if (this.selectedColumnId !== null) {
      this.moved.emit({columnId: this.selectedColumnId});
    }
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

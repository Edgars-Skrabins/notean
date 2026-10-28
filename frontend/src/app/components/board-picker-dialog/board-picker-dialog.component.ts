import {Component, EventEmitter, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {EscapeService} from '@services/escape.service';
import {BoardListService} from '@services/board-list.service';
import {BoardSummary} from '@models/board.model';
import {ButtonComponent} from '@components/button/button.component';
import {IconComponent} from '@components/icon/icon.component';

@Component({
  selector: 'app-board-picker-dialog',
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    TranslatePipe,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './board-picker-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './board-picker-dialog.component.css'
})
export class BoardPickerDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Output() picked = new EventEmitter<number>();
  @Output() cancelled = new EventEmitter<void>();

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService, protected boardListService: BoardListService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.cancelled.emit());
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  trackById(_index: number, board: BoardSummary): number {
    return board.id;
  }
}

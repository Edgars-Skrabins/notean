import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {NgFor} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';

export interface MoveTargetColumn {
  id: number;
  title: string;
}

@Component({
  selector: 'app-move-to-board-dialog',
  standalone: true,
  imports: [
    NgFor,
    FormsModule,
    TranslateModule,
    ButtonComponent
  ],
  templateUrl: './move-to-board-dialog.component.html',
  styleUrl: './move-to-board-dialog.component.css'
})
export class MoveToBoardDialogComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) columns: MoveTargetColumn[] = [];
  @Output() moved = new EventEmitter<{ columnId: number }>();
  @Output() cancelled = new EventEmitter<void>();

  selectedColumnId: number | null = null;

  ngOnInit() {
    this.selectedColumnId = this.columns[0]?.id ?? null;
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

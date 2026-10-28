import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {PriorityColor} from '@models/priority.model';
import {IconComponent} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {PriorityColorPickerComponent} from '@components/priority-color-picker/priority-color-picker.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

export interface TemplateRow {
  key: number;
  name: string;
  color: PriorityColor | null;
}

@Component({
  selector: 'app-template-rows',
  imports: [
    NgFor,
    NgIf,
    FormsModule,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    TranslatePipe,
    IconComponent,
    IconButtonComponent,
    PriorityColorPickerComponent,
    TooltipDirective
  ],
  templateUrl: './template-rows.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './template-rows.component.css'
})
export class TemplateRowsComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) rows: TemplateRow[] = [];
  @Input({required: true}) label!: string;
  @Input({required: true}) addLabel!: string;
  @Input({required: true}) removeLabel!: string;
  @Input() maxLength = 200;
  @Input() readonly = false;
  @Output() added = new EventEmitter<void>();

  trackByKey(_index: number, row: TemplateRow): number {
    return row.key;
  }

  handleDropped(event: CdkDragDrop<TemplateRow[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    moveItemInArray(this.rows, event.previousIndex, event.currentIndex);
  }

  handleRemove(row: TemplateRow) {
    this.rows.splice(this.rows.indexOf(row), 1);
  }

  handleColorChange(row: TemplateRow, color: PriorityColor) {
    row.color = color;
  }
}

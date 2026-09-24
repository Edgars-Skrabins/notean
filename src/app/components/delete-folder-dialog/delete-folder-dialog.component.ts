import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';

@Component({
  selector: 'app-delete-folder-dialog',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    ButtonComponent
  ],
  templateUrl: './delete-folder-dialog.component.html',
  styleUrl: './delete-folder-dialog.component.css'
})
export class DeleteFolderDialogComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) folderTitle!: string;
  @Output() confirmed = new EventEmitter<{ mode: 'cascade' | 'promote' }>();
  @Output() cancelled = new EventEmitter<void>();

  deleteNestedContents = false;

  handleConfirm() {
    this.confirmed.emit({mode: this.deleteNestedContents ? 'cascade' : 'promote'});
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

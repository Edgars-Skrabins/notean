import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';
import {FolderDeleteMode} from "@models/folder.model";
import {EscapeService} from '@services/escape.service';

@Component({
  selector: 'app-delete-folder-dialog',
  imports: [
    TranslatePipe,
    ButtonComponent,
    CheckboxComponent
  ],
  templateUrl: './delete-folder-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './delete-folder-dialog.component.css'
})
export class DeleteFolderDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) folderTitle!: string;
  @Output() confirmed = new EventEmitter<{ mode: FolderDeleteMode }>();
  @Output() cancelled = new EventEmitter<void>();

  deleteNestedContents = false;

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
    this.confirmed.emit({mode: this.deleteNestedContents ? 'cascade' : 'promote'});
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

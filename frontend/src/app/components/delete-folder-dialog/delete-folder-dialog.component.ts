import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';
import {FolderDeleteMode} from "@models/folder.model";
import {EscapeService} from '@services/escape.service';
import {uniqueId} from '@utils/uniqueId';

@Component({
  selector: 'app-delete-folder-dialog',
  imports: [
    CdkTrapFocus,
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
  protected readonly titleId = uniqueId('deleteFolderDialog');

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

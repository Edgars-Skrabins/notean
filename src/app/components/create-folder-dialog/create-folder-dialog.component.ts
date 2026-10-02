import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';

@Component({
  selector: 'app-create-folder-dialog',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    ButtonComponent
  ],
  templateUrl: './create-folder-dialog.component.html',
  styleUrl: './create-folder-dialog.component.css'
})
export class CreateFolderDialogComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  @Output() confirmed = new EventEmitter<{ title: string }>();
  @Output() cancelled = new EventEmitter<void>();

  folderTitle = '';

  constructor(private translateService: TranslateService) {
  }

  ngOnInit() {
    this.folderTitle = this.translateService.instant(PHRASES.UNTITLED_FOLDER);
  }

  handleConfirm() {
    const title = this.folderTitle.trim() || this.translateService.instant(PHRASES.UNTITLED_FOLDER);
    this.confirmed.emit({title});
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

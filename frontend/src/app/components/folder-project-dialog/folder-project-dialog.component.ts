import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';
import {ProjectSelectComponent} from '@components/project-select/project-select.component';
import {EscapeService} from '@services/escape.service';

@Component({
  selector: 'app-folder-project-dialog',
  imports: [
    TranslateModule,
    ButtonComponent,
    ProjectSelectComponent
  ],
  templateUrl: './folder-project-dialog.component.html',
  styleUrl: './folder-project-dialog.component.css'
})
export class FolderProjectDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) folderTitle!: string;
  @Input() projectId: number | null = null;
  @Output() confirmed = new EventEmitter<{ projectId: number | null }>();
  @Output() cancelled = new EventEmitter<void>();

  selectedProjectId: number | null = null;

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleCancel());
    this.selectedProjectId = this.projectId;
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  handleConfirm() {
    this.confirmed.emit({projectId: this.selectedProjectId});
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

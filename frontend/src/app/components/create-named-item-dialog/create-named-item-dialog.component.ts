import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TITLE_MAX_LENGTH} from '@config/contentLimits';
import {ButtonComponent} from '@components/button/button.component';
import {ProjectSelectComponent} from '@components/project-select/project-select.component';
import {EscapeService} from '@services/escape.service';
import {ProjectFilterService} from '@services/project-filter.service';

@Component({
  selector: 'app-create-named-item-dialog',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    FormsModule,
    TranslateModule,
    ButtonComponent,
    ProjectSelectComponent
  ],
  templateUrl: './create-named-item-dialog.component.html',
  styleUrl: './create-named-item-dialog.component.css'
})
export class CreateNamedItemDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;

  @Input({required: true}) dialogTitle!: string;
  @Input({required: true}) defaultValue!: string;
  @Input() showProjectSelect = false;
  @Input() projectId: number | null = null;
  @Output() confirmed = new EventEmitter<{ title: string; projectId: number | null }>();
  @Output() cancelled = new EventEmitter<void>();

  itemTitle = '';
  selectedProjectId: number | null = null;

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService, protected projectFilterService: ProjectFilterService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleCancel());
    this.itemTitle = this.defaultValue;
    this.selectedProjectId = this.projectId;
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  handleConfirm() {
    const title = this.itemTitle.trim() || this.defaultValue;
    this.confirmed.emit({title, projectId: this.selectedProjectId});
  }

  handleCancel() {
    this.cancelled.emit();
  }
}

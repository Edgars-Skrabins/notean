import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {CdkScrollable} from '@angular/cdk/scrolling';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TITLE_MAX_LENGTH} from "@config/contentLimits";
import {FolderedItemDetail} from "@models/foldered-item.model";
import {FavoritableType} from "@models/favorite.model";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {EditConflictDialogComponent} from "@components/edit-conflict-dialog/edit-conflict-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {ItemDetailSidebarComponent} from "@components/item-detail-sidebar/item-detail-sidebar.component";
import {EscapeService} from "@services/escape.service";

@Component({
  selector: 'app-item-detail-layout',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    CdkScrollable,
    TranslateModule,
    IconButtonComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EditConflictDialogComponent,
    FavoriteStarComponent,
    ItemDetailSidebarComponent
  ],
  templateUrl: './item-detail-layout.component.html',
  styleUrl: './item-detail-layout.component.css'
})
export class ItemDetailLayoutComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;

  @Input() item: FolderedItemDetail | null = null;
  @Input({required: true}) favoriteType!: FavoritableType;
  @Input({required: true}) titlePlaceholder!: string;
  @Input({required: true}) editingBannerText!: string;
  @Input({required: true}) confirmDeleteMessage!: string;
  @Input() discardConfirmMessage = '';
  @Input() mode: 'view' | 'edit' | 'create' = 'view';
  @Input() draftTitle = '';
  @Input() editingNickname: string | null = null;
  @Input() alertMessage = '';
  @Input() showDeleteConfirm = false;
  @Input() showDiscardConfirm = false;
  @Input() showEditConflict = false;
  @Input() draftProjectId: number | null = null;
  @Input() projectSetByFolder = false;
  @Input() busy = false;
  @Input() fill = false;
  @Output() draftTitleChange = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<void>();
  @Output() cancelRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<void>();
  @Output() deleteCancelled = new EventEmitter<void>();
  @Output() projectChange = new EventEmitter<number | null>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() discardConfirmed = new EventEmitter<void>();
  @Output() discardCancelled = new EventEmitter<void>();
  @Output() conflictLoadLatest = new EventEmitter<void>();
  @Output() conflictOverwrite = new EventEmitter<void>();
  @Output() conflictCancelled = new EventEmitter<void>();
  @Output() draftProjectChange = new EventEmitter<number | null>();
  @Output() escapePressed = new EventEmitter<void>();

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.escapePressed.emit());
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  handleProjectSelected(projectId: number | null) {
    if (this.mode === 'create') {
      this.draftProjectChange.emit(projectId);
      return;
    }

    this.projectChange.emit(projectId);
  }
}

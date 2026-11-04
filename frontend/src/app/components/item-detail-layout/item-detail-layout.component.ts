import {Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {CdkScrollable} from '@angular/cdk/scrolling';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {TranslatePipe} from "@ngx-translate/core";
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
import {uniqueId} from "@utils/uniqueId";

@Component({
  selector: 'app-item-detail-layout',
  imports: [
    FormsModule,
    NgIf,
    CdkScrollable,
    CdkTrapFocus,
    TranslatePipe,
    IconButtonComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EditConflictDialogComponent,
    FavoriteStarComponent,
    ItemDetailSidebarComponent
  ],
  templateUrl: './item-detail-layout.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './item-detail-layout.component.css'
})
export class ItemDetailLayoutComponent implements OnInit, OnChanges, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly titleId = uniqueId('itemDetailLayout');

  @Input() item: FolderedItemDetail | null = null;
  @Input({required: true}) favoriteType!: FavoritableType;
  @Input({required: true}) titlePlaceholder!: string;
  @Input({required: true}) editingBannerText!: string;
  @Input({required: true}) confirmDeleteMessage!: string;
  @Input() discardConfirmMessage = '';
  @Input() createHeading = '';
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
  @Input() isTemplate = false;
  @Input() canManage = true;
  @Input() showSidebar = true;
  @Input() autofocusTitle = false;
  @Output() draftTitleChange = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<void>();
  @Output() cancelRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() copyLinkRequested = new EventEmitter<void>();
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

  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;

  @ViewChild(CdkTrapFocus) trapFocus?: CdkTrapFocus;

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.escapePressed.emit());
  }

  ngOnChanges(changes: SimpleChanges) {
    const autofocus = changes['autofocusTitle'];
    if (!autofocus?.currentValue || autofocus.previousValue) {
      return;
    }

    setTimeout(() => {
      this.titleInput?.nativeElement.focus();
      this.titleInput?.nativeElement.select();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode'] && !changes['mode'].firstChange) {
      this.trapFocus?.focusTrap.focusInitialElementWhenReady();
    }
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

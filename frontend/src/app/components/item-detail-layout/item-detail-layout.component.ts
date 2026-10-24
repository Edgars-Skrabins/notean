import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AsyncPipe, DatePipe, NgFor, NgIf} from '@angular/common';
import {CdkScrollable} from '@angular/cdk/scrolling';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {FolderedItemDetail} from "@models/foldered-item.model";
import {FavoritableType} from "@models/favorite.model";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {ProjectSelectComponent} from "@components/project-select/project-select.component";
import {ProjectFilterService} from "@services/project-filter.service";
import {EscapeService} from "@services/escape.service";

@Component({
  selector: 'app-item-detail-layout',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    AsyncPipe,
    DatePipe,
    CdkScrollable,
    TranslateModule,
    AvatarComponent,
    IconButtonComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    FavoriteStarComponent,
    ProjectSelectComponent
  ],
  templateUrl: './item-detail-layout.component.html',
  styleUrl: './item-detail-layout.component.css'
})
export class ItemDetailLayoutComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

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
  @Input() draftProjectId: number | null = null;
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
  @Output() draftProjectChange = new EventEmitter<number | null>();
  @Output() escapePressed = new EventEmitter<void>();

  private unregisterEscape = () => {};

  constructor(
    protected projectFilterService: ProjectFilterService,
    private escapeService: EscapeService
  ) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.escapePressed.emit());
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  get selectedProjectId(): number | null {
    return this.mode === 'create' ? this.draftProjectId : this.item?.projectId ?? null;
  }

  handleProjectSelected(projectId: number | null) {
    if (this.mode === 'create') {
      this.draftProjectChange.emit(projectId);
      return;
    }

    this.projectChange.emit(projectId);
  }
}

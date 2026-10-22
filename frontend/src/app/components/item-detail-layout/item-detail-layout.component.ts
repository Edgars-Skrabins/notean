import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AsyncPipe, DatePipe, NgFor, NgIf} from '@angular/common';
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

@Component({
  selector: 'app-item-detail-layout',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    AsyncPipe,
    DatePipe,
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
export class ItemDetailLayoutComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) item!: FolderedItemDetail;
  @Input({required: true}) favoriteType!: FavoritableType;
  @Input({required: true}) titlePlaceholder!: string;
  @Input({required: true}) editingBannerText!: string;
  @Input({required: true}) confirmDeleteMessage!: string;
  @Input() mode: 'view' | 'edit' = 'view';
  @Input() draftTitle = '';
  @Input() editingNickname: string | null = null;
  @Input() alertMessage = '';
  @Input() showDeleteConfirm = false;
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

  constructor(protected projectFilterService: ProjectFilterService) {
  }
}

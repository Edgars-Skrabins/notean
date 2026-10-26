import {Component, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {CdkDrag, CdkDragDrop, CdkDropList} from '@angular/cdk/drag-drop';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {Favorite} from '@models/favorite.model';
import {FavoriteService} from '@services/favorite.service';
import {IconComponent} from '@components/icon/icon.component';
import {FavoriteStarComponent} from '@components/favorite-star/favorite-star.component';
import {favoriteRoute} from '@utils/favoriteRoute';
import {favoriteTypeIcon} from '@utils/favoriteTypeIcon';
import {favoriteTypeLabel} from '@utils/favoriteTypeLabel';

@Component({
  selector: 'app-favorites-grid',
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    TranslateModule,
    IconComponent,
    FavoriteStarComponent,
    CdkDropList,
    CdkDrag
  ],
  templateUrl: './favorites-grid.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './favorites-grid.component.css'
})
export class FavoritesGridComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly favoriteTypeIcon = favoriteTypeIcon;
  protected readonly favoriteTypeLabel = favoriteTypeLabel;

  constructor(
    private router: Router,
    protected favoriteService: FavoriteService
  ) {
  }

  trackById(_index: number, favorite: Favorite) {
    return favorite.id;
  }

  handleOpen(favorite: Favorite) {
    this.router.navigate(favoriteRoute(favorite));
  }

  handleDrop(event: CdkDragDrop<Favorite[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.favoriteService.move('home', (event.item.data as Favorite).id, event.currentIndex);
  }
}

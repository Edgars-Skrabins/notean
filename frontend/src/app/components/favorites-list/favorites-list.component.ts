import {Component} from '@angular/core';
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

@Component({
  selector: 'app-favorites-list',
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
  templateUrl: './favorites-list.component.html',
  styleUrl: './favorites-list.component.css'
})
export class FavoritesListComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly favoriteTypeIcon = favoriteTypeIcon;

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

    this.favoriteService.move('sidebar', (event.item.data as Favorite).id, event.currentIndex);
  }
}

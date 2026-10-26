import {Component, HostBinding, Input, ChangeDetectionStrategy} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {FavoritableType} from '@models/favorite.model';
import {FavoriteService} from '@services/favorite.service';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-favorite-star',
  imports: [
    TranslateModule,
    IconButtonComponent
  ],
  templateUrl: './favorite-star.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './favorite-star.component.css'
})
export class FavoriteStarComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) type!: FavoritableType;
  @Input({required: true}) itemId!: number;
  @Input({required: true}) title!: string;
  @Input() size: 28 | 36 = 28;

  constructor(private favoriteService: FavoriteService) {
  }

  @HostBinding('class.favoriteStar--favorited')
  get favorited(): boolean {
    return this.favoriteService.isFavorited(this.type, this.itemId);
  }

  handleClick(event: MouseEvent) {
    event.stopPropagation();
    this.favoriteService.toggle(this.type, this.itemId, this.title);
  }
}

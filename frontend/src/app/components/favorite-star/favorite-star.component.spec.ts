import {FavoriteStarComponent} from "./favorite-star.component";
import {FavoriteService} from "@services/favorite.service";

describe('FavoriteStarComponent', () => {
  let component: FavoriteStarComponent;
  let favoriteService: jasmine.SpyObj<FavoriteService>;

  beforeEach(() => {
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['isFavorited', 'toggle']);
    favoriteService.toggle.and.returnValue(Promise.resolve());
    component = new FavoriteStarComponent(favoriteService);
    component.type = 'Page';
    component.itemId = 10;
    component.title = 'Notes';
  });

  it('is filled when the item is favorited', () => {
    favoriteService.isFavorited.and.returnValue(true);

    expect(component.favorited).toBeTrue();
    expect(favoriteService.isFavorited).toHaveBeenCalledWith('Page', 10);
  });

  it('is empty when the item is not favorited', () => {
    favoriteService.isFavorited.and.returnValue(false);

    expect(component.favorited).toBeFalse();
  });

  it('toggles the item on click', () => {
    component.handleClick(new MouseEvent('click'));

    expect(favoriteService.toggle).toHaveBeenCalledWith('Page', 10, 'Notes');
  });

  it('stops the click from reaching the row', () => {
    const event = new MouseEvent('click');
    spyOn(event, 'stopPropagation');

    component.handleClick(event);

    expect(event.stopPropagation).toHaveBeenCalled();
  });
});

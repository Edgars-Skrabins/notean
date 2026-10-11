import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {TranslateModule} from '@ngx-translate/core';
import {FavoritesGridComponent} from './favorites-grid.component';
import {FavoriteService} from '@services/favorite.service';
import {Favorite} from '@models/favorite.model';
import {PHRASES} from '@config/phrases';
import {AppRoutes} from '../../app/app-routes.enum';

function buildFavorite(overrides: Partial<Favorite>): Favorite {
  return {
    id: 1,
    favoritableType: 'Page',
    favoritableId: 10,
    title: 'Notes',
    projectId: null,
    boardId: null,
    boardTitle: null,
    inBacklog: false,
    homePosition: 0,
    sidebarPosition: 0,
    ...overrides,
  };
}

describe('FavoritesGridComponent', () => {
  let fixture: ComponentFixture<FavoritesGridComponent>;
  let homeFavorites: BehaviorSubject<Favorite[]>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    homeFavorites = new BehaviorSubject<Favorite[]>([]);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['move', 'toggle', 'isFavorited'], {homeFavorites$: homeFavorites});
    favoriteService.isFavorited.and.returnValue(true);
    favoriteService.toggle.and.returnValue(Promise.resolve());
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [FavoritesGridComponent, TranslateModule.forRoot()],
      providers: [
        {provide: FavoriteService, useValue: favoriteService},
        {provide: Router, useValue: router},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesGridComponent);
  });

  function tileTitles(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.favoritesGrid__tileTitle'))
      .map((element) => (element as HTMLElement).textContent!.trim());
  }

  it('renders tiles in home order', () => {
    homeFavorites.next([
      buildFavorite({id: 2, title: 'Second'}),
      buildFavorite({id: 1, title: 'First', favoritableId: 11}),
    ]);
    fixture.detectChanges();

    expect(tileTitles()).toEqual(['Second', 'First']);
  });

  it('shows a ticket tile with its board title', () => {
    homeFavorites.next([buildFavorite({favoritableType: 'Ticket', boardId: 5, boardTitle: 'Sprint 12'})]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.favoritesGrid__tileMeta').textContent).toContain('Sprint 12');
  });

  it('shows the empty hint without favorites', () => {
    fixture.detectChanges();

    expect(tileTitles()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(PHRASES.NO_FAVORITES_HOME);
  });

  it('unstars without opening the item', () => {
    homeFavorites.next([buildFavorite({})]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('app-favorite-star button') as HTMLButtonElement).click();

    expect(favoriteService.toggle).toHaveBeenCalledWith('Page', 10, 'Notes');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates to the item when a tile is clicked', () => {
    homeFavorites.next([buildFavorite({favoritableType: 'Ticket', favoritableId: 100, boardId: 5})]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.favoritesGrid__tile') as HTMLElement).click();

    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.KANBAN, AppRoutes.TICKETS, 100]);
  });

  it('moves the dropped favorite on the home surface', () => {
    const favorite = buildFavorite({id: 7});

    fixture.componentInstance.handleDrop({previousIndex: 2, currentIndex: 0, item: {data: favorite}} as unknown as CdkDragDrop<Favorite[]>);

    expect(favoriteService.move).toHaveBeenCalledWith('home', 7, 0);
  });

  it('ignores a drop back in the same place', () => {
    fixture.componentInstance.handleDrop({previousIndex: 1, currentIndex: 1, item: {data: buildFavorite({})}} as unknown as CdkDragDrop<Favorite[]>);

    expect(favoriteService.move).not.toHaveBeenCalled();
  });
});

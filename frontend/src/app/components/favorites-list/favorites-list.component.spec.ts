import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {provideTranslateService} from '@ngx-translate/core';
import {FavoritesListComponent} from './favorites-list.component';
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

describe('FavoritesListComponent', () => {
  let fixture: ComponentFixture<FavoritesListComponent>;
  let sidebarFavorites: BehaviorSubject<Favorite[]>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    sidebarFavorites = new BehaviorSubject<Favorite[]>([]);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['move', 'toggle', 'isFavorited'], {sidebarFavorites$: sidebarFavorites});
    favoriteService.isFavorited.and.returnValue(true);
    favoriteService.toggle.and.returnValue(Promise.resolve());
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [FavoritesListComponent],
      providers: [
        provideTranslateService(),
        {provide: FavoriteService, useValue: favoriteService},
        {provide: Router, useValue: router},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesListComponent);
  });

  function rowTitles(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.favoritesList__rowTitle'))
      .map((element) => (element as HTMLElement).textContent!.trim());
  }

  it('renders rows in sidebar order', () => {
    sidebarFavorites.next([
      buildFavorite({id: 2, title: 'Second'}),
      buildFavorite({id: 1, title: 'First', favoritableId: 11}),
    ]);
    fixture.detectChanges();

    expect(rowTitles()).toEqual(['Second', 'First']);
  });

  it('shows the empty hint without favorites', () => {
    fixture.detectChanges();

    expect(rowTitles()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(PHRASES.NO_FAVORITES_SIDEBAR);
  });

  it('unstars without opening the item', () => {
    sidebarFavorites.next([buildFavorite({})]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('app-favorite-star button') as HTMLButtonElement).click();

    expect(favoriteService.toggle).toHaveBeenCalledWith('Page', 10, 'Notes');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates to the item when a row is clicked', () => {
    sidebarFavorites.next([buildFavorite({favoritableType: 'Ticket', favoritableId: 100, boardId: 5})]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.favoritesList__row') as HTMLElement).click();

    expect(router.navigate).toHaveBeenCalledWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 5, AppRoutes.KANBAN, AppRoutes.TICKETS, 100]);
  });

  it('moves the dropped favorite on the sidebar surface', () => {
    const favorite = buildFavorite({id: 7});

    fixture.componentInstance.handleDrop({previousIndex: 2, currentIndex: 0, item: {data: favorite}} as unknown as CdkDragDrop<Favorite[]>);

    expect(favoriteService.move).toHaveBeenCalledWith('sidebar', 7, 0);
  });

  it('ignores a drop back in the same place', () => {
    fixture.componentInstance.handleDrop({previousIndex: 1, currentIndex: 1, item: {data: buildFavorite({})}} as unknown as CdkDragDrop<Favorite[]>);

    expect(favoriteService.move).not.toHaveBeenCalled();
  });
});

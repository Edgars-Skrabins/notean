import {ComponentFixture, TestBed} from '@angular/core/testing';
import {TranslateModule} from '@ngx-translate/core';
import {ItemTreeComponent, TreeFolder, TreeItem} from './item-tree.component';
import {FavoriteService} from '@services/favorite.service';

function buildItem(overrides: Partial<TreeItem> = {}): TreeItem {
  return {
    id: 10,
    title: 'Notes',
    folderId: null,
    meta: {creator: {nickname: 'Ann'}, updatedAt: '2026-10-01T10:00:00Z'},
    ...overrides,
  };
}

describe('ItemTreeComponent', () => {
  let fixture: ComponentFixture<ItemTreeComponent>;
  let component: ItemTreeComponent;
  let openedItems: TreeItem[];

  beforeEach(async () => {
    const favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['toggle', 'isFavorited']);
    favoriteService.isFavorited.and.returnValue(false);
    favoriteService.toggle.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [ItemTreeComponent, TranslateModule.forRoot()],
      providers: [{provide: FavoriteService, useValue: favoriteService}],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemTreeComponent);
    component = fixture.componentInstance;
    component.favoritableType = 'Page';
    component.deleteItemConfirmMessage = 'Delete?';
    openedItems = [];
    component.openItem.subscribe((item) => openedItems.push(item));
  });

  function render(folders: TreeFolder[], items: TreeItem[]) {
    fixture.componentRef.setInput('folders', folders);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  }

  function query<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  it('opens the item when its row main is clicked', () => {
    const item = buildItem();
    render([], [item]);

    query<HTMLButtonElement>('.itemTree__row--item .itemTree__rowMain').click();

    expect(openedItems).toEqual([item]);
  });

  it('opens the item when the row padding around its buttons is clicked', () => {
    const item = buildItem();
    render([], [item]);

    query<HTMLElement>('.itemTree__row--item').click();

    expect(openedItems).toEqual([item]);
  });

  it('does not open the item when an action button is clicked', () => {
    render([], [buildItem()]);

    query<HTMLButtonElement>('.itemTree__row--item app-favorite-star button').click();
    query<HTMLButtonElement>('.itemTree__row--item .iconButton--danger').click();

    expect(openedItems).toEqual([]);
  });

  it('toggles a folder from its row main and its row padding', () => {
    render([{id: 1, title: 'Docs', parentId: null}], [buildItem({folderId: 1})]);

    query<HTMLButtonElement>('.itemTree__row--folder .itemTree__rowMain').click();
    expect(component.isExpanded(1)).toBeTrue();

    query<HTMLElement>('.itemTree__row--folder').click();
    expect(component.isExpanded(1)).toBeFalse();
  });

});

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {TranslateModule} from '@ngx-translate/core';
import {ItemTreeComponent, TreeFolder, TreeItem} from './item-tree.component';
import {FavoriteService} from '@services/favorite.service';
import {PHRASES} from '@config/phrases';

function buildItem(overrides: Partial<TreeItem> = {}): TreeItem {
  return {
    id: 10,
    title: 'Notes',
    folderId: null,
    projectId: null,
    lockVersion: 0,
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
    component.itemIcon = 'page';
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
    render([{id: 1, title: 'Docs', parentId: null, projectId: null}], [buildItem({folderId: 1})]);

    query<HTMLButtonElement>('.itemTree__row--folder .itemTree__rowMain').click();
    expect(component.isExpanded(1)).toBeTrue();

    query<HTMLElement>('.itemTree__row--folder').click();
    expect(component.isExpanded(1)).toBeFalse();
  });

  it('offers to change the project on top-level folders only', () => {
    const requested: { folderId: number }[] = [];
    component.changeFolderProject.subscribe((event) => requested.push(event));
    fixture.componentRef.setInput('canChangeFolderProject', true);
    render([{id: 1, title: 'Docs', parentId: null, projectId: null}, {id: 2, title: 'Inner', parentId: 1, projectId: null}], []);
    query<HTMLButtonElement>('.itemTree__row--folder .itemTree__rowMain').click();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(`[aria-label="${PHRASES.CHANGE_FOLDER_PROJECT}"]`);
    expect(buttons.length).toBe(1);

    (buttons[0] as HTMLButtonElement).click();
    expect(requested).toEqual([{folderId: 1}]);
  });

  it('hides the change project button when it is not allowed', () => {
    render([{id: 1, title: 'Docs', parentId: null, projectId: null}], []);

    expect(query(`[aria-label="${PHRASES.CHANGE_FOLDER_PROJECT}"]`)).toBeNull();
  });

  describe('item rename', () => {
    let renamed: { itemId: number; title: string }[];

    beforeEach(() => {
      renamed = [];
      component.renameItem.subscribe((event) => renamed.push(event));
      render([], [buildItem()]);
      query<HTMLButtonElement>(`.itemTree__row--item [aria-label="${PHRASES.RENAME_ITEM}"]`).click();
      fixture.detectChanges();
    });

    function renameInput(): HTMLInputElement {
      return query<HTMLInputElement>('.itemTree__renameInput');
    }

    function typeTitle(title: string) {
      renameInput().value = title;
      renameInput().dispatchEvent(new Event('input'));
    }

    function press(key: string) {
      renameInput().dispatchEvent(new KeyboardEvent('keydown', {key}));
      fixture.detectChanges();
    }

    it('opens an input with the current title selected', async () => {
      await fixture.whenStable();
      const input = renameInput();

      expect(input.value).toBe('Notes');
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('Notes'.length);
      expect(openedItems).toEqual([]);
    });

    it('commits the trimmed title on Enter', () => {
      typeTitle('  Meeting notes ');
      press('Enter');

      expect(renamed).toEqual([{itemId: 10, title: 'Meeting notes'}]);
      expect(renameInput()).toBeNull();
    });

    it('cancels on Escape', () => {
      typeTitle('Meeting notes');
      press('Escape');

      expect(renamed).toEqual([]);
      expect(renameInput()).toBeNull();
      expect(query('.itemTree__row--item .itemTree__rowTitle').textContent).toBe('Notes');
    });

    it('cancels an empty title', () => {
      typeTitle('   ');
      press('Enter');

      expect(renamed).toEqual([]);
      expect(renameInput()).toBeNull();
    });
  });
});

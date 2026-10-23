import {ComponentFixture, TestBed} from '@angular/core/testing';
import {TranslateModule} from '@ngx-translate/core';
import {ListRowComponent} from './list-row.component';
import {FavoriteService} from '@services/favorite.service';
import {ticketSummary} from '../../testing/boardFixtures';

describe('ListRowComponent', () => {
  let fixture: ComponentFixture<ListRowComponent>;
  let openedCount: number;

  beforeEach(async () => {
    const favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['toggle', 'isFavorited']);
    favoriteService.isFavorited.and.returnValue(false);
    favoriteService.toggle.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [ListRowComponent, TranslateModule.forRoot()],
      providers: [{provide: FavoriteService, useValue: favoriteService}],
    }).compileComponents();

    fixture = TestBed.createComponent(ListRowComponent);
    fixture.componentRef.setInput('ticket', ticketSummary(1, null));
    fixture.componentRef.setInput('statusTitle', 'Backlog');
    openedCount = 0;
    fixture.componentInstance.opened.subscribe(() => openedCount++);
    fixture.detectChanges();
  });

  function query<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  it('opens the ticket from the title and from the cells around it', () => {
    query<HTMLButtonElement>('.listRow__main').click();
    query<HTMLElement>('.listRow__status').click();
    query<HTMLElement>('.listRow').click();

    expect(openedCount).toBe(3);
  });

  it('does not open the ticket from the checkbox or the actions', () => {
    query<HTMLElement>('.listRow__checkbox').click();
    query<HTMLButtonElement>('.listRow__actions .iconButton--danger').click();

    expect(openedCount).toBe(0);
  });
});

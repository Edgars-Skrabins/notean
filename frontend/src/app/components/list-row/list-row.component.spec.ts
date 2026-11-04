import {ComponentFixture, TestBed} from '@angular/core/testing';
import {DatePipe} from '@angular/common';
import {provideTranslateService} from '@ngx-translate/core';
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
      imports: [ListRowComponent],
      providers: [provideTranslateService(), {provide: FavoriteService, useValue: favoriteService}],
    }).compileComponents();

    fixture = TestBed.createComponent(ListRowComponent);
    fixture.componentRef.setInput('ticket', ticketSummary(1, null));
    openedCount = 0;
    fixture.componentInstance.opened.subscribe(() => openedCount++);
    fixture.detectChanges();
  });

  function query<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  it('opens the ticket from the title and from the cells around it', () => {
    query<HTMLButtonElement>('.listRow__main').click();
    query<HTMLElement>('.listRow__date').click();
    query<HTMLElement>('.listRow').click();

    expect(openedCount).toBe(3);
  });

  it('shows the created date and no status label, since the group header names the status', () => {
    const ticket = fixture.componentInstance.ticket;

    expect(query('.listRow__status')).toBeNull();
    expect(query('.listRow__date').textContent!.trim()).toBe(new DatePipe('en-US').transform(ticket.createdAt, 'mediumDate')!);
  });

  it('does not open the ticket from the checkbox or the actions', () => {
    query<HTMLElement>('.listRow__checkbox').click();
    query<HTMLButtonElement>('.listRow__actions .iconButton--danger').click();

    expect(openedCount).toBe(0);
  });
});

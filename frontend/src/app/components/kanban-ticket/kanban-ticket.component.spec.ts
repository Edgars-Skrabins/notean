import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {KanbanTicketComponent} from './kanban-ticket.component';
import {FavoriteService} from '@services/favorite.service';
import {BoardPriority} from '@models/priority.model';
import {PHRASES} from '@config/phrases';
import {ticketSummary} from '../../testing/boardFixtures';

describe('KanbanTicketComponent', () => {
  let fixture: ComponentFixture<KanbanTicketComponent>;
  let openedCount: number;
  let deleteCount: number;
  const priority: BoardPriority = {id: 21, name: 'High', color: 'orange', position: 1, ticketCount: 1};

  beforeEach(async () => {
    const favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['toggle', 'isFavorited']);
    favoriteService.isFavorited.and.returnValue(false);
    favoriteService.toggle.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [KanbanTicketComponent],
      providers: [provideTranslateService(), {provide: FavoriteService, useValue: favoriteService}],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanTicketComponent);
    fixture.componentRef.setInput('ticket', ticketSummary(1, 10));
    openedCount = 0;
    deleteCount = 0;
    fixture.componentInstance.opened.subscribe(() => openedCount++);
    fixture.componentInstance.deleteTicket.subscribe(() => deleteCount++);
  });

  function query<T extends HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  it('shows the priority name and its coloured dot', () => {
    fixture.componentRef.setInput('priority', priority);
    fixture.detectChanges();

    expect(query('.kanbanTicket__priorityName')?.textContent?.trim()).toBe('High');
    expect(query('.kanbanTicket__priority .priorityDot')?.getAttribute('data-color')).toBe('orange');
  });

  it('renders no meta line without priority, attachments or assignees', () => {
    fixture.detectChanges();

    expect(query('.kanbanTicket__meta')).toBeNull();
  });

  it('opens the ticket from the meta line', () => {
    fixture.componentRef.setInput('priority', priority);
    fixture.detectChanges();

    query<HTMLElement>('.kanbanTicket__meta')!.click();

    expect(openedCount).toBe(1);
  });

  it('deletes from the Delete button without opening the ticket', () => {
    fixture.detectChanges();

    query<HTMLButtonElement>('.kanbanTicket__actions .iconButton--danger')!.click();

    expect(deleteCount).toBe(1);
    expect(openedCount).toBe(0);
  });

  it('orders the actions Move to backlog, Delete, favourite star', () => {
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.kanbanTicket__actions button'))
      .map((button) => (button as HTMLElement).getAttribute('aria-label'));

    expect(labels.slice(0, 2)).toEqual([PHRASES.MOVE_TO_BACKLOG, PHRASES.DELETE_TICKET]);
    expect(query<HTMLElement>('.kanbanTicket__actions')!.lastElementChild!.tagName.toLowerCase()).toBe('app-favorite-star');
  });
});

import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, skip} from 'rxjs';
import {moveItemInArray} from '@angular/cdk/drag-drop';
import {BoardSummary} from "@models/board.model";
import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {ProjectFilterService} from "@services/project-filter.service";

const ORDER_KEY_PREFIX = 'boardOrder:';
const OPEN_KEY = 'sidebarBoardsOpen';

export function orderBoards(boards: BoardSummary[], storedOrder: number[]): BoardSummary[] {
  const byId = new Map(boards.map((board) => [board.id, board]));
  const ordered = storedOrder.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const known = new Set(storedOrder);
  const unordered = boards
    .filter((board) => !known.has(board.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...unordered, ...ordered];
}

@Injectable({
  providedIn: 'root',
})
export class BoardListService {
  private boardsSubject = new BehaviorSubject<BoardSummary[]>([]);

  readonly boards$: Observable<BoardSummary[]> = this.boardsSubject.asObservable();

  isOpen = localStorage.getItem(OPEN_KEY) !== 'false';

  constructor(
    private boardService: BoardService,
    private teamService: TeamService,
    private projectFilterService: ProjectFilterService
  ) {
    this.projectFilterService.selectedProjectId$.pipe(skip(1)).subscribe(() => this.load());
  }

  async load() {
    const teamCode = this.teamService.getCurrentTeamCode();
    const response = await this.boardService.listBoards(teamCode, this.projectFilterService.getSelectedProjectId());
    if (response.success) {
      this.boardsSubject.next(orderBoards(response.boards, this.readOrder(teamCode)));
    }
    return response;
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
    localStorage.setItem(OPEN_KEY, String(this.isOpen));
  }

  move(previousIndex: number, currentIndex: number) {
    const boards = [...this.boardsSubject.value];
    moveItemInArray(boards, previousIndex, currentIndex);
    this.publish(boards);
  }

  add(board: BoardSummary) {
    this.publish([board, ...this.boardsSubject.value]);
  }

  remove(id: number) {
    this.publish(this.boardsSubject.value.filter((board) => board.id !== id));
  }

  rename(id: number, title: string) {
    this.boardsSubject.next(this.boardsSubject.value.map((board) => board.id === id ? {...board, title} : board));
  }

  private publish(boards: BoardSummary[]) {
    this.boardsSubject.next(boards);
    localStorage.setItem(this.orderKey(this.teamService.getCurrentTeamCode()), JSON.stringify(boards.map((board) => board.id)));
  }

  private readOrder(teamCode: string): number[] {
    try {
      const stored = JSON.parse(localStorage.getItem(this.orderKey(teamCode)) ?? '[]');
      return Array.isArray(stored) ? stored.filter((id): id is number => typeof id === 'number') : [];
    } catch {
      return [];
    }
  }

  private orderKey(teamCode: string): string {
    return `${ORDER_KEY_PREFIX}${teamCode}`;
  }
}

import {Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {OverlayModule} from '@angular/cdk/overlay';
import {debounceTime, from, map, merge, Subject, Subscription, switchMap} from 'rxjs';
import {PHRASES} from '@config/phrases';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {SearchService} from '@services/search.service';
import {TeamService} from '@services/team.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {SearchResult, SearchResultType, SearchSection} from '@models/search.model';
import {IconComponent} from '@components/icon/icon.component';
import {boardRoute, ticketRoute} from '@utils/ticketRoute';
import {SnippetParts, splitSnippet} from '@utils/splitSnippet';
import {AppRoutes} from '../../app/app-routes.enum';

export const MIN_QUERY_LENGTH = 1;
export const SEARCH_DEBOUNCE_MS = 250;

const SECTION_PHRASES: Record<SearchResultType, string> = {
  project: PHRASES.PROJECTS,
  page: PHRASES.DOCUMENT_PAGES,
  diagram: PHRASES.DIAGRAMS,
  board: PHRASES.BOARDS,
  ticket: PHRASES.TICKETS,
};

type NavItem = { result: SearchResult; section?: undefined } | { section: SearchSection; result?: undefined };

@Component({
  selector: 'app-global-search',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    OverlayModule,
    IconComponent
  ],
  templateUrl: './global-search.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './global-search.component.css'
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly SECTION_PHRASES = SECTION_PHRASES;
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;

  @ViewChild('input', {static: true}) input!: ElementRef<HTMLInputElement>;

  query = '';
  sections: SearchSection[] = [];
  isOpen = false;
  isLoading = false;
  hasError = false;
  includeAllProjects = false;
  loadingMoreType: SearchResultType | null = null;
  activeIndex = -1;
  panelWidth = 0;

  private searchedQuery = '';
  private searchedProjectId: number | null = null;
  private typed = new Subject<string>();
  private immediate = new Subject<string>();
  private subscription: Subscription | null = null;

  constructor(
    private router: Router,
    private searchService: SearchService,
    private teamService: TeamService,
    private projectFilterService: ProjectFilterService
  ) {
  }

  ngOnInit() {
    this.subscription = merge(this.typed.pipe(debounceTime(SEARCH_DEBOUNCE_MS)), this.immediate).pipe(
      switchMap((query) => {
        const projectId = this.projectId();
        return from(this.searchService.search(this.teamService.getCurrentTeamCode(), query, projectId))
          .pipe(map((response) => ({query, projectId, response})));
      })
    ).subscribe(({query, projectId, response}) => {
      if (query !== this.trimmedQuery()) {
        return;
      }
      this.isLoading = false;
      this.hasError = !response.success;
      this.sections = response.success ? response.sections : [];
      this.searchedQuery = query;
      this.searchedProjectId = projectId;
      this.activeIndex = -1;
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  get visibleSections(): SearchSection[] {
    return this.sections.filter((section) => section.results.length > 0);
  }

  get isEmpty(): boolean {
    return !this.isLoading && !this.hasError && this.visibleSections.length === 0;
  }

  get selectedProjectName(): string | null {
    const projectId = this.projectFilterService.getSelectedProjectId();
    if (projectId === null || this.includeAllProjects) {
      return null;
    }
    return this.projectFilterService.getProjects().find((project) => project.id === projectId)?.name ?? null;
  }

  @HostListener('document:keydown', ['$event'])
  handleDocumentKeydown(event: KeyboardEvent) {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || this.isTyping(event.target)) {
      return;
    }
    event.preventDefault();
    this.input.nativeElement.focus();
  }

  handleInput(value: string) {
    this.query = value;
    if (this.trimmedQuery().length < MIN_QUERY_LENGTH) {
      this.isOpen = false;
      this.isLoading = false;
      this.sections = [];
      this.activeIndex = -1;
      return;
    }
    this.open();
    this.isLoading = true;
    this.typed.next(this.trimmedQuery());
  }

  handleFocus() {
    if (this.trimmedQuery().length >= MIN_QUERY_LENGTH && !this.isOpen) {
      this.open();
      this.search();
    }
  }

  handleKeydown(event: KeyboardEvent) {
    const items = this.navItems();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex = Math.min(Math.max(this.activeIndex + step, 0), items.length - 1);
    } else if (event.key === 'Enter') {
      const item = items[this.activeIndex];
      if (item?.result) {
        this.openResult(item.result);
      } else if (item?.section) {
        this.showMore(item.section);
      }
    } else if (event.key === 'Escape') {
      if (this.isOpen) {
        event.preventDefault();
      }
      this.close();
      this.input.nativeElement.blur();
    }
  }

  handleOutsideClick(event: MouseEvent) {
    if (event.target === this.input.nativeElement) {
      return;
    }
    this.close();
  }

  handleIncludeAllProjects() {
    this.includeAllProjects = true;
    this.search();
  }

  showMore(section: SearchSection) {
    if (this.loadingMoreType) {
      return;
    }
    this.loadingMoreType = section.type;
    this.searchService.searchMore(this.teamService.getCurrentTeamCode(), this.searchedQuery, this.searchedProjectId, section.type, section.results.length)
      .then((response) => {
        this.loadingMoreType = null;
        if (!this.sections.includes(section)) {
          return;
        }
        if (!response.success) {
          this.hasError = true;
          return;
        }
        section.results = [...section.results, ...response.section.results];
        section.hasMore = response.section.hasMore;
      });
  }

  openResult(result: SearchResult) {
    this.router.navigate(this.resultRoute(result));
    this.query = '';
    this.sections = [];
    this.close();
    this.input.nativeElement.blur();
  }

  close() {
    this.isOpen = false;
    this.includeAllProjects = false;
    this.activeIndex = -1;
  }

  resultRoute(result: SearchResult): (string | number)[] {
    switch (result.type) {
      case 'project':
        return [AppRoutes.DASHBOARD, AppRoutes.PROJECTS, result.id];
      case 'page':
        return [AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, result.id];
      case 'diagram':
        return [AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, result.id];
      case 'board':
        return boardRoute(result.id);
      case 'ticket':
        return ticketRoute(result.boardId!, result.id, result.inBacklog!);
    }
  }

  context(result: SearchResult): string | null {
    return result.type === 'ticket' ? result.boardTitle ?? null : result.projectName;
  }

  snippetParts(snippet: string): SnippetParts {
    return splitSnippet(snippet, this.searchedQuery);
  }

  isActive(item: SearchResult | SearchSection): boolean {
    const active = this.navItems()[this.activeIndex];
    return !!active && (active.result === item || active.section === item);
  }

  private navItems(): NavItem[] {
    return this.visibleSections.flatMap((section): NavItem[] => [
      ...section.results.map((result) => ({result})),
      ...(section.hasMore ? [{section}] : []),
    ]);
  }

  private open() {
    this.panelWidth = this.input.nativeElement.getBoundingClientRect().width;
    this.isOpen = true;
  }

  private search() {
    this.isLoading = true;
    this.immediate.next(this.trimmedQuery());
  }

  private projectId(): number | null {
    return this.includeAllProjects ? null : this.projectFilterService.getSelectedProjectId();
  }

  private trimmedQuery(): string {
    return this.query.trim();
  }

  private isTyping(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return !!element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable);
  }
}

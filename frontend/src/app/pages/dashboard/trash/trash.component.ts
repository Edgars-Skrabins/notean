import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {debounceTime, distinctUntilChanged, map, skip, Subject, Subscription} from 'rxjs';
import {TranslatePipe, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {defaultLanguage} from "@config/translationConfig";
import {ErrorCode} from "@config/errorCodes";
import {TrashService} from "@services/trash.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {ToastType} from "@models/toast.model";
import {DropdownOption} from "@models/dropdown.model";
import {TrashEntry, TrashItemType, TrashTypeFilter} from "@models/trash.model";
import {ButtonComponent} from "@components/button/button.component";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {IconComponent, IconName} from "@components/icon/icon.component";
import {DropdownComponent} from "@components/dropdown/dropdown.component";
import {LoadMoreComponent} from "@components/load-more/load-more.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {errorPhrase} from "@utils/errorPhrase";
import {relativeDate} from "@utils/relativeDate";

const DAY_MS = 24 * 60 * 60 * 1000;

const TYPE_ICONS: Record<TrashItemType, IconName> = {
  Page: 'page',
  Diagram: 'diagram',
  Board: 'board',
  Ticket: 'ticket',
  Folder: 'folder',
  ChatChannel: 'chat',
};

@Component({
  selector: 'app-trash',
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslatePipe,
    ButtonComponent,
    IconButtonComponent,
    IconComponent,
    DropdownComponent,
    LoadMoreComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './trash.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './trash.component.css'
})
export class TrashComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly typeOptions: DropdownOption[] = [
    {value: null, labelKey: PHRASES.TRASH_TYPE_ALL},
    {value: 'page', labelKey: PHRASES.DOCUMENT_PAGES},
    {value: 'diagram', labelKey: PHRASES.DIAGRAMS},
    {value: 'board', labelKey: PHRASES.BOARDS},
    {value: 'ticket', labelKey: PHRASES.TICKETS},
    {value: 'folder', labelKey: PHRASES.TRASH_TYPE_FOLDERS},
    {value: 'chat_channel', labelKey: PHRASES.TRASH_TYPE_CHANNELS},
  ];

  entries: TrashEntry[] | null = null;
  hasMore = false;
  isLoadingMore = false;
  searchQuery = '';
  activeSearch = '';
  typeFilter: TrashTypeFilter | null = null;
  entryPendingDeletion: TrashEntry | null = null;
  isEmptyConfirmOpen = false;

  private readonly teamCode: string;
  private loadGeneration = 0;
  private searchTerms = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  private projectSubscription: Subscription | null = null;

  constructor(
    private trashService: TrashService,
    private teamService: TeamService,
    private toastService: ToastService,
    private projectFilterService: ProjectFilterService,
    private translateService: TranslateService
  ) {
    this.teamCode = this.teamService.getCurrentTeamCode();
  }

  get canEmpty(): boolean {
    const role = this.teamService.getCurrentRole();
    return role === 'owner' || role === 'admin';
  }

  ngOnInit() {
    this.loadPage(true);
    this.projectSubscription = this.projectFilterService.selectedProjectId$.pipe(skip(1)).subscribe(() => this.loadPage(true));
    this.searchSubscription = this.searchTerms
      .pipe(map((query) => query.trim()), debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.activeSearch = term;
        this.loadPage(true);
      });
  }

  ngOnDestroy() {
    this.projectSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
  }

  handleSearchChange(query: string) {
    this.searchTerms.next(query);
  }

  handleTypeChange(type: string | number | null) {
    this.typeFilter = type as TrashTypeFilter | null;
    this.loadPage(true);
  }

  handleLoadMore() {
    if (!this.isLoadingMore) {
      this.loadPage(false);
    }
  }

  icon(entry: TrashEntry): IconName {
    return TYPE_ICONS[entry.itemType];
  }

  deletedAgo(entry: TrashEntry): string {
    return relativeDate(entry.deletedAt, this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage);
  }

  daysLeft(entry: TrashEntry): number {
    return Math.max(0, Math.ceil((new Date(entry.purgeAt).getTime() - Date.now()) / DAY_MS));
  }

  handleRestore(entry: TrashEntry) {
    this.trashService.restore(this.teamCode, [entry.id])
      .then((response) => {
        if (!response.success) {
          this.handleFailure(entry, response.code);
          return;
        }

        this.removeEntry(entry);
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.ITEM_RESTORED});
      });
  }

  handleDeleteForever(entry: TrashEntry) {
    this.entryPendingDeletion = entry;
  }

  handleCancelDeleteForever() {
    this.entryPendingDeletion = null;
  }

  handleConfirmDeleteForever() {
    const entry = this.entryPendingDeletion;
    this.entryPendingDeletion = null;
    if (!entry) {
      return;
    }

    this.trashService.deleteForever(this.teamCode, entry.id)
      .then((response) => {
        if (!response.success) {
          this.handleFailure(entry, response.code);
          return;
        }

        this.removeEntry(entry);
      });
  }

  handleEmpty() {
    this.isEmptyConfirmOpen = true;
  }

  handleCancelEmpty() {
    this.isEmptyConfirmOpen = false;
  }

  handleConfirmEmpty() {
    this.isEmptyConfirmOpen = false;
    this.trashService.empty(this.teamCode)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }

        this.loadGeneration++;
        this.entries = [];
        this.hasMore = false;
      });
  }

  private handleFailure(entry: TrashEntry, code: ErrorCode) {
    if (code === 'TRASH_ENTRY_NOT_FOUND') {
      this.removeEntry(entry);
    }
    this.toastService.show({type: ToastType.ERROR, message: errorPhrase(code)});
  }

  private removeEntry(entry: TrashEntry) {
    this.entries = (this.entries ?? []).filter((candidate) => candidate.id !== entry.id);
  }

  private loadPage(reset: boolean) {
    const generation = reset ? ++this.loadGeneration : this.loadGeneration;
    const loaded = reset ? [] : this.entries ?? [];
    this.isLoadingMore = !reset;
    this.trashService.list(this.teamCode, {
      offset: loaded.length,
      type: this.typeFilter,
      search: this.activeSearch,
      projectId: this.projectFilterService.getSelectedProjectId(),
    })
      .then((response) => {
        if (generation !== this.loadGeneration) {
          return;
        }
        this.isLoadingMore = false;
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          this.entries = loaded;
          return;
        }

        const loadedIds = new Set(response.entries.map((entry) => entry.id));
        this.entries = [...loaded.filter((entry) => !loadedIds.has(entry.id)), ...response.entries];
        this.hasMore = response.hasMore;
      });
  }
}

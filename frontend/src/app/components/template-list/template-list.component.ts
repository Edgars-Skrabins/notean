import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {debounceTime, distinctUntilChanged, map, Subject, Subscription} from 'rxjs';
import {PHRASES} from '@config/phrases';
import {BUILT_IN_TEMPLATES} from '@config/builtInTemplates';
import {TemplateService} from '@services/template.service';
import {TeamService} from '@services/team.service';
import {BUILT_IN_TEMPLATE_PREFIX, BuiltInTemplate, TemplateKind, TemplateSummary} from '@models/template.model';
import {errorPhrase} from '@utils/errorPhrase';
import {IconComponent} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {LoadMoreComponent} from '@components/load-more/load-more.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-template-list',
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    FormsModule,
    TranslatePipe,
    IconComponent,
    IconButtonComponent,
    LoadMoreComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './template-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './template-list.component.css'
})
export class TemplateListComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) kind!: TemplateKind;
  @Input({required: true}) emptyLabel!: string;
  @Input() showActions = false;
  @Output() opened = new EventEmitter<string>();
  @Output() used = new EventEmitter<string>();

  templates: TemplateSummary[] = [];
  hasMore = false;
  isLoading = true;
  isLoadingMore = false;
  alertMessage = '';
  searchQuery = '';
  activeSearch = '';
  templatePendingDelete: TemplateSummary | null = null;

  private readonly teamCode: string;
  private loadGeneration = 0;
  private searchTerms = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  constructor(private templateService: TemplateService, teamService: TeamService) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  get builtIns(): BuiltInTemplate[] {
    const term = this.searchQuery.trim().toLowerCase();
    return BUILT_IN_TEMPLATES.filter((template) => template.kind === this.kind && template.title.toLowerCase().includes(term));
  }

  get canUse(): boolean {
    return this.showActions && this.kind !== 'board';
  }

  get isEmpty(): boolean {
    return !this.isLoading && !this.activeSearch && !this.templates.length && !this.builtIns.length;
  }

  get hasNoSearchResults(): boolean {
    return !this.isLoading && !!this.activeSearch && !this.templates.length && !this.builtIns.length;
  }

  ngOnInit() {
    this.load();
    this.searchSubscription = this.searchTerms
      .pipe(map((query) => query.trim()), debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.activeSearch = term;
        this.load();
      });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  builtInRef(template: BuiltInTemplate): string {
    return `${BUILT_IN_TEMPLATE_PREFIX}${template.key}`;
  }

  teamRef(template: TemplateSummary): string {
    return String(template.id);
  }

  trackById(_index: number, template: TemplateSummary): number {
    return template.id;
  }

  handleSearchChange(query: string) {
    this.searchTerms.next(query);
  }

  handleLoadMore() {
    this.load(true);
  }

  handleDelete(template: TemplateSummary) {
    this.templatePendingDelete = template;
  }

  handleDeleteCancelled() {
    this.templatePendingDelete = null;
  }

  handleDeleteConfirmed() {
    const template = this.templatePendingDelete;
    this.templatePendingDelete = null;
    if (!template) {
      return;
    }

    this.templateService.delete(this.teamCode, template.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.templates = this.templates.filter((candidate) => candidate.id !== template.id);
      });
  }

  private load(append = false) {
    const generation = ++this.loadGeneration;
    if (append) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
    }

    this.templateService.list(this.teamCode, this.kind, this.activeSearch, append ? this.templates.length : 0)
      .then((response) => {
        if (generation !== this.loadGeneration) {
          return;
        }

        this.isLoading = false;
        this.isLoadingMore = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.templates = append ? [...this.templates, ...response.templates] : response.templates;
        this.hasMore = response.hasMore;
      });
  }
}

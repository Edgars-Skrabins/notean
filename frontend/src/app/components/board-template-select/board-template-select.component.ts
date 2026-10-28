import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslatePipe} from '@ngx-translate/core';
import {debounceTime, distinctUntilChanged, map, Subject, Subscription} from 'rxjs';
import {PHRASES} from '@config/phrases';
import {TemplateService} from '@services/template.service';
import {TeamService} from '@services/team.service';
import {DropdownOption} from '@models/dropdown.model';
import {TemplateSummary} from '@models/template.model';
import {DropdownComponent} from '@components/dropdown/dropdown.component';

@Component({
  selector: 'app-board-template-select',
  imports: [
    NgIf,
    FormsModule,
    TranslatePipe,
    DropdownComponent
  ],
  templateUrl: './board-template-select.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './board-template-select.component.css'
})
export class BoardTemplateSelectComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input() templateId: number | null = null;
  @Output() templateIdChange = new EventEmitter<number | null>();

  options: DropdownOption[] = [{value: null, labelKey: PHRASES.DEFAULT_BOARD_TEMPLATE}];
  showSearch = false;
  searchQuery = '';

  private readonly teamCode: string;
  private selected: TemplateSummary | null = null;
  private listed: TemplateSummary[] = [];
  private loadGeneration = 0;
  private searchTerms = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  constructor(private templateService: TemplateService, teamService: TeamService) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  ngOnInit() {
    this.load('');
    this.searchSubscription = this.searchTerms
      .pipe(map((query) => query.trim()), debounceTime(300), distinctUntilChanged())
      .subscribe((term) => this.load(term));
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  handleSearchChange(query: string) {
    this.searchTerms.next(query);
  }

  handleValueChange(value: string | number | null) {
    const templateId = value === null ? null : Number(value);
    this.selected = this.listed.find((template) => template.id === templateId) ?? null;
    this.templateIdChange.emit(templateId);
  }

  private load(search: string) {
    const generation = ++this.loadGeneration;
    this.templateService.list(this.teamCode, 'board', search)
      .then((response) => {
        if (generation !== this.loadGeneration || !response.success) {
          return;
        }

        if (response.hasMore) {
          this.showSearch = true;
        }
        const selected = this.selected;
        this.listed = selected && !response.templates.some((template) => template.id === selected.id)
          ? [selected, ...response.templates]
          : response.templates;
        this.options = [
          {value: null, labelKey: PHRASES.DEFAULT_BOARD_TEMPLATE},
          ...this.listed.map((template) => ({value: template.id, label: template.title})),
        ];
      });
  }
}

import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {PageService} from "@services/page.service";
import {TeamService} from "@services/team.service";
import {PageSummary} from "@models/page.model";

@Component({
  selector: 'app-document-pages',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    DatePipe,
    TranslateModule
  ],
  templateUrl: './document-pages.component.html',
  styleUrl: './document-pages.component.css'
})
export class DocumentPagesComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  pages: PageSummary[] = [];
  searchQuery = '';
  isLoading = true;
  alertMessage = '';

  private teamCode: string;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private requestSequence = 0;

  constructor(
    private router: Router,
    private pageService: PageService,
    private teamService: TeamService,
    private translateService: TranslateService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  ngOnInit() {
    this.loadPages();
  }

  ngOnDestroy() {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
  }

  handleSearchChange() {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
    this.searchDebounceHandle = setTimeout(() => this.loadPages(), 300);
  }

  handleCreatePage() {
    const untitledTitle = this.translateService.instant(PHRASES.UNTITLED_PAGE);

    this.pageService.createPage(this.teamCode, untitledTitle)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }
        this.router.navigate(['/dashboard/pages', response.page.id], {queryParams: {edit: true}});
      });
  }

  handleOpenPage(page: PageSummary) {
    this.router.navigate(['/dashboard/pages', page.id]);
  }

  private loadPages() {
    const sequence = ++this.requestSequence;
    this.isLoading = true;

    this.pageService.listPages(this.teamCode, this.searchQuery || undefined)
      .then((response) => {
        if (sequence !== this.requestSequence) {
          return;
        }
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.pages = response.pages;
      });
  }
}

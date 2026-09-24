import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {DiagramService} from "@services/diagram.service";
import {TeamService} from "@services/team.service";
import {DiagramSummary} from "@models/diagram.model";

@Component({
  selector: 'app-diagrams',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    DatePipe,
    TranslateModule
  ],
  templateUrl: './diagrams.component.html',
  styleUrl: './diagrams.component.css'
})
export class DiagramsComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  diagrams: DiagramSummary[] = [];
  searchQuery = '';
  isLoading = true;
  alertMessage = '';

  private teamCode: string;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private requestSequence = 0;

  constructor(
    private router: Router,
    private diagramService: DiagramService,
    private teamService: TeamService,
    private translateService: TranslateService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  ngOnInit() {
    this.loadDiagrams();
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
    this.searchDebounceHandle = setTimeout(() => this.loadDiagrams(), 300);
  }

  handleCreateDiagram() {
    const untitledTitle = this.translateService.instant(PHRASES.UNTITLED_DIAGRAM);

    this.diagramService.createDiagram(this.teamCode, untitledTitle)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }
        this.router.navigate(['/dashboard/diagrams', response.diagram.id], {queryParams: {edit: true}});
      });
  }

  handleOpenDiagram(diagram: DiagramSummary) {
    this.router.navigate(['/dashboard/diagrams', diagram.id]);
  }

  private loadDiagrams() {
    const sequence = ++this.requestSequence;
    this.isLoading = true;

    this.diagramService.listDiagrams(this.teamCode, this.searchQuery || undefined)
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
        this.diagrams = response.diagrams;
      });
  }
}

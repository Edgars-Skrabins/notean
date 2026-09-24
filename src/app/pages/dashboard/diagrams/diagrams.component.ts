import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {DiagramService} from "@services/diagram.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {DiagramSummary} from "@models/diagram.model";
import {ButtonComponent} from "@components/button/button.component";
import {ItemTreeComponent, TreeFolder, TreeItem} from "@components/item-tree/item-tree.component";

@Component({
  selector: 'app-diagrams',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    ButtonComponent,
    ItemTreeComponent
  ],
  templateUrl: './diagrams.component.html',
  styleUrl: './diagrams.component.css'
})
export class DiagramsComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  folders: TreeFolder[] = [];
  items: TreeItem[] = [];
  searchQuery = '';
  isLoading = true;
  alertMessage = '';

  private teamCode: string;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private requestSequence = 0;

  constructor(
    private router: Router,
    private diagramService: DiagramService,
    private folderService: FolderService,
    private teamService: TeamService,
    private translateService: TranslateService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  ngOnInit() {
    this.loadData();
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
    this.searchDebounceHandle = setTimeout(() => this.loadData(), 300);
  }

  handleOpenDiagram(item: TreeItem) {
    this.router.navigate(['/dashboard/diagrams', item.id]);
  }

  handleCreateFolder(parentId: number | null) {
    const untitledTitle = this.translateService.instant(PHRASES.UNTITLED_FOLDER);

    this.folderService.createFolder(this.teamCode, 'Diagram', untitledTitle, parentId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleCreateDiagram(parentId: number | null) {
    const untitledTitle = this.translateService.instant(PHRASES.UNTITLED_DIAGRAM);

    this.diagramService.createDiagram(this.teamCode, untitledTitle)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        const diagramId = response.diagram.id;
        const afterMove = parentId !== null
          ? this.diagramService.moveToFolder(this.teamCode, diagramId, parentId)
          : Promise.resolve(response);

        afterMove.then(() => {
          this.router.navigate(['/dashboard/diagrams', diagramId], {queryParams: {edit: true}});
        });
      });
  }

  handleMoveItem(event: { itemId: number; folderId: number | null }) {
    this.diagramService.moveToFolder(this.teamCode, event.itemId, event.folderId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleMoveFolder(event: { folderId: number; parentId: number | null }) {
    this.folderService.moveFolder(this.teamCode, event.folderId, event.parentId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  handleDeleteFolder(event: { folderId: number; mode: 'cascade' | 'promote' }) {
    this.folderService.deleteFolder(this.teamCode, event.folderId, event.mode)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  private loadData() {
    const sequence = ++this.requestSequence;
    this.isLoading = true;

    Promise.all([
      this.folderService.listFolders(this.teamCode, 'Diagram'),
      this.diagramService.listDiagrams(this.teamCode, this.searchQuery || undefined)
    ]).then(([foldersResponse, diagramsResponse]) => {
      if (sequence !== this.requestSequence) {
        return;
      }
      this.isLoading = false;

      if (!foldersResponse.success) {
        this.alertMessage = foldersResponse.statusMessage;
        return;
      }
      if (!diagramsResponse.success) {
        this.alertMessage = diagramsResponse.statusMessage;
        return;
      }

      this.alertMessage = '';
      this.folders = foldersResponse.folders.map((folder) => ({
        id: folder.id,
        title: folder.title,
        parentId: folder.parentId,
      }));
      this.items = diagramsResponse.diagrams.map((diagram) => this.toTreeItem(diagram));
    });
  }

  private toTreeItem(diagram: DiagramSummary): TreeItem {
    return {
      id: diagram.id,
      title: diagram.title,
      folderId: diagram.folderId,
      meta: {
        creator: {username: diagram.creator.username},
        updatedAt: diagram.updatedAt,
      },
    };
  }
}

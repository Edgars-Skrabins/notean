import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {DiagramService} from "@services/diagram.service";
import {FolderService} from "@services/folder.service";
import {TeamService} from "@services/team.service";
import {FolderItemType} from "@models/folder.model";
import {AppRoutes} from "../../../app/app-routes.enum";
import {ButtonComponent} from "@components/button/button.component";
import {ItemTreeComponent, TreeItem} from "@components/item-tree/item-tree.component";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {FolderedItemSummary, FolderedListPageComponent} from "../foldered-list-page.base";

@Component({
  selector: 'app-diagrams',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    ButtonComponent,
    ItemTreeComponent,
    CreateNamedItemDialogComponent
  ],
  templateUrl: './diagrams.component.html',
  styleUrl: './diagrams.component.css'
})
export class DiagramsComponent extends FolderedListPageComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly itemType: FolderItemType = 'Diagram';

  constructor(
    private router: Router,
    private diagramService: DiagramService,
    folderService: FolderService,
    teamService: TeamService,
    private translateService: TranslateService
  ) {
    super(folderService, teamService);
  }

  handleOpenDiagram(item: TreeItem) {
    this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, item.id]);
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
          this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, diagramId], {queryParams: {edit: true}});
        });
      });
  }

  protected listItems(search?: string): Promise<
    | { success: true; items: FolderedItemSummary[] }
    | { success: false; statusMessage: string }
  > {
    return this.diagramService.listDiagrams(this.teamCode, search).then((response) => {
      if (!response.success) {
        return response;
      }
      return {success: true, items: response.diagrams};
    });
  }

  protected moveItemToFolder(itemId: number, folderId: number | null) {
    return this.diagramService.moveToFolder(this.teamCode, itemId, folderId);
  }

  protected deleteItemById(itemId: number) {
    return this.diagramService.deleteDiagram(this.teamCode, itemId);
  }
}

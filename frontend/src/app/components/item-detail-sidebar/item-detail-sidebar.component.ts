import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, DatePipe, NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {FolderedItemDetail} from "@models/foldered-item.model";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {ProjectSelectComponent} from "@components/project-select/project-select.component";
import {ProjectFilterService} from "@services/project-filter.service";

@Component({
  selector: 'app-item-detail-sidebar',
  imports: [NgIf, NgFor, AsyncPipe, DatePipe, TranslatePipe, AvatarComponent, ProjectSelectComponent],
  templateUrl: './item-detail-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './item-detail-sidebar.component.css'
})
export class ItemDetailSidebarComponent {
  protected readonly PHRASES = PHRASES;

  @Input() item: FolderedItemDetail | null = null;
  @Input() mode: 'view' | 'edit' | 'create' = 'view';
  @Input() draftProjectId: number | null = null;
  @Input() projectSetByFolder = false;
  @Input() isTemplate = false;
  @Output() projectSelected = new EventEmitter<number | null>();

  constructor(protected projectFilterService: ProjectFilterService) {
  }

  get selectedProjectId(): number | null {
    return this.mode === 'create' ? this.draftProjectId : this.item?.projectId ?? null;
  }

  get selectedProjectName(): string | null {
    const projectId = this.selectedProjectId;
    return this.projectFilterService.getProjects().find((project) => project.id === projectId)?.name ?? null;
  }
}

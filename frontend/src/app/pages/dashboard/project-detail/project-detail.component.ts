import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {Subscription} from 'rxjs';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {ErrorCode} from "@config/errorCodes";
import {ProjectService} from "@services/project.service";
import {TeamService, ALL_FEATURES_ENABLED} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {NavigationService} from "@services/navigation.service";
import {PageService} from "@services/page.service";
import {DiagramService} from "@services/diagram.service";
import {BoardService} from "@services/board.service";
import {ToastType} from "@models/toast.model";
import {ProjectDetail} from "@models/project.model";
import {TeamFeature, TeamFeatures, TeamMember} from "@models/team.model";
import {BoardUser} from "@models/board.model";
import {HasUnsavedChanges} from "@models/unsaved-changes.model";
import {IconName} from "@components/icon/icon.component";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {ButtonComponent} from "@components/button/button.component";
import {ProjectItemRowComponent} from "@components/project-item-row/project-item-row.component";
import {ProjectSettingsDialogComponent} from "@components/project-settings-dialog/project-settings-dialog.component";
import {errorPhrase} from "@utils/errorPhrase";
import {boardRoute} from "@utils/ticketRoute";
import {AppRoutes} from "../../../app/app-routes.enum";
import {EscapeService} from "@services/escape.service";

export interface ProjectItem {
  id: number;
  title: string;
  creator: { nickname: string };
  updatedAt: string;
}

export interface ProjectItemGroup {
  feature: TeamFeature;
  label: string;
  icon: IconName;
  items: ProjectItem[];
}

function newestFirst(items: ProjectItem[]): ProjectItem[] {
  return [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    TranslateModule,
    AvatarComponent,
    ButtonComponent,
    ProjectItemRowComponent,
    ProjectSettingsDialogComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css'
})
export class ProjectDetailComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  protected readonly PHRASES = PHRASES;

  @ViewChild(ProjectSettingsDialogComponent) settingsDialog?: ProjectSettingsDialogComponent;

  project: ProjectDetail | null = null;
  members: TeamMember[] = [];
  alertMessage = '';
  features: TeamFeatures = ALL_FEATURES_ENABLED;
  itemsLoaded = false;
  isSettingsOpen = false;
  groups: ProjectItemGroup[] = [
    {feature: 'pages', label: PHRASES.DOCUMENT_PAGES, icon: 'page', items: []},
    {feature: 'diagrams', label: PHRASES.DIAGRAMS, icon: 'diagram', items: []},
    {feature: 'boards', label: PHRASES.BOARDS, icon: 'board', items: []},
  ];

  private featuresSubscription?: Subscription;

  private unregisterEscape = () => {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private pageService: PageService,
    private diagramService: DiagramService,
    private boardService: BoardService,
    private teamService: TeamService,
    private toastService: ToastService,
    private navigationService: NavigationService,
    private escapeService: EscapeService
  ) {
  }

  private get teamCode(): string {
    return this.teamService.getCurrentTeamCode();
  }

  get visibleGroups(): ProjectItemGroup[] {
    return this.groups.filter((group) => this.features[group.feature] && group.items.length);
  }

  get people(): { user: BoardUser; isOwner: boolean }[] {
    if (!this.project) {
      return [];
    }

    const owner = this.project.owner;
    return [
      {user: owner, isOwner: true},
      ...this.project.members.filter((member) => member.id !== owner.id).map((user) => ({user, isOwner: false})),
    ];
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleGoBack());
    const projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.featuresSubscription = this.teamService.features$.subscribe((features) => {
      this.features = features;
    });
    this.projectService.getProject(this.teamCode, projectId).then((response) => {
      if (!response.success) {
        this.alertMessage = errorPhrase(response.code);
        return;
      }
      this.project = response.project;
    });
    this.loadItems(projectId);
  }

  ngOnDestroy() {
    this.unregisterEscape();
    this.featuresSubscription?.unsubscribe();
  }

  handleOpenItem(group: ProjectItemGroup, item: ProjectItem) {
    switch (group.feature) {
      case 'pages':
        this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, item.id]);
        break;
      case 'diagrams':
        this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, item.id]);
        break;
      case 'boards':
        this.router.navigate(boardRoute(item.id));
        break;
    }
  }

  handleOpenSettings() {
    this.teamService.fetchTeamMembers(this.teamCode).then((members) => {
      this.members = members;
      this.isSettingsOpen = true;
    });
  }

  handleSettingsClosed() {
    this.isSettingsOpen = false;
  }

  handleSaved(project: ProjectDetail) {
    this.project = project;
  }

  handleDeleted() {
    this.isSettingsOpen = false;
    this.handleGoBack();
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.PROJECTS);
  }

  confirmLeave(): boolean | Promise<boolean> {
    return this.settingsDialog?.confirmLeave() ?? true;
  }

  private loadItems(projectId: number) {
    const requests: Record<TeamFeature, () => Promise<ProjectItem[]>> = {
      pages: () => this.pageService.list(this.teamCode, projectId).then((response) => response.success ? response.items : this.failedItems(response.code)),
      diagrams: () => this.diagramService.list(this.teamCode, projectId).then((response) => response.success ? response.items : this.failedItems(response.code)),
      boards: () => this.boardService.listBoards(this.teamCode, projectId).then((response) => response.success ? response.boards : this.failedItems(response.code)),
    };

    Promise.all(this.groups.map((group) => this.teamService.isFeatureEnabled(group.feature) ? requests[group.feature]() : Promise.resolve([])))
      .then((results) => {
        this.groups = this.groups.map((group, index) => ({...group, items: newestFirst(results[index])}));
        this.itemsLoaded = true;
      });
  }

  private failedItems(code: ErrorCode): ProjectItem[] {
    this.toastService.show({type: ToastType.ERROR, message: errorPhrase(code)});
    return [];
  }
}

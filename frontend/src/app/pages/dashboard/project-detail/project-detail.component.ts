import {Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {Subscription} from 'rxjs';
import {TranslatePipe} from "@ngx-translate/core";
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
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {LoadMoreComponent} from "@components/load-more/load-more.component";
import {ProjectItemRowComponent} from "@components/project-item-row/project-item-row.component";
import {ProjectSettingsDialogComponent} from "@components/project-settings-dialog/project-settings-dialog.component";
import {errorPhrase} from "@utils/errorPhrase";
import {boardRoute} from "@utils/ticketRoute";
import {AppRoutes} from "../../../app/app-routes.enum";
import {EscapeService} from "@services/escape.service";
import {CopyLinkService} from "@services/copy-link.service";

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
  hasMore: boolean;
  isLoading: boolean;
}

interface ProjectItemPage {
  items: ProjectItem[];
  hasMore: boolean;
}

function newestFirst(items: ProjectItem[]): ProjectItem[] {
  return [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

@Component({
  selector: 'app-project-detail',
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    TranslatePipe,
    AvatarComponent,
    ButtonComponent,
    IconButtonComponent,
    LoadMoreComponent,
    ProjectItemRowComponent,
    ProjectSettingsDialogComponent
  ],
  templateUrl: './project-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
    {feature: 'pages', label: PHRASES.DOCUMENT_PAGES, icon: 'page', items: [], hasMore: false, isLoading: false},
    {feature: 'diagrams', label: PHRASES.DIAGRAMS, icon: 'diagram', items: [], hasMore: false, isLoading: false},
    {feature: 'boards', label: PHRASES.BOARDS, icon: 'board', items: [], hasMore: false, isLoading: false},
  ];

  private projectId = 0;

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
    private escapeService: EscapeService,
    private copyLinkService: CopyLinkService
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
    this.projectId = projectId;
    this.featuresSubscription = this.teamService.features$.subscribe((features) => {
      this.features = features;
    });
    this.projectService.getProject(this.teamCode, projectId).then((response) => {
      if (!response.success) {
        if (response.code === 'PROJECT_NOT_FOUND') {
          this.navigationService.navigateReplacingUrl(AppRoutes.UNAVAILABLE);
          return;
        }
        this.alertMessage = errorPhrase(response.code);
        return;
      }
      this.project = response.project;
    });
    this.loadItems();
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

  handleLoadMore(group: ProjectItemGroup) {
    if (group.isLoading) {
      return;
    }

    this.updateGroup(group.feature, {isLoading: true});
    this.loadGroupPage(group.feature, group.items.length).then((page) => {
      const current = this.groups.find((candidate) => candidate.feature === group.feature)!;
      if (!page) {
        this.updateGroup(group.feature, {isLoading: false});
        return;
      }

      const loadedIds = new Set(page.items.map((item) => item.id));
      this.updateGroup(group.feature, {
        items: [...current.items.filter((item) => !loadedIds.has(item.id)), ...page.items],
        hasMore: page.hasMore,
        isLoading: false,
      });
    });
  }

  handleCopyLink() {
    this.copyLinkService.copyCurrentLink();
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

  private loadItems() {
    Promise.all(this.groups.map((group) => this.teamService.isFeatureEnabled(group.feature) ? this.loadGroupPage(group.feature, 0) : Promise.resolve(null)))
      .then((pages) => {
        this.groups = this.groups.map((group, index) => ({...group, items: pages[index]?.items ?? [], hasMore: pages[index]?.hasMore ?? false}));
        this.itemsLoaded = true;
      });
  }

  private loadGroupPage(feature: TeamFeature, offset: number): Promise<ProjectItemPage | null> {
    const projectId = this.projectId;
    switch (feature) {
      case 'pages':
        return this.pageService.list(this.teamCode, {projectId, offset})
          .then((response) => response.success ? {items: response.items, hasMore: response.hasMore} : this.failedPage(response.code));
      case 'diagrams':
        return this.diagramService.list(this.teamCode, {projectId, offset})
          .then((response) => response.success ? {items: response.items, hasMore: response.hasMore} : this.failedPage(response.code));
      case 'boards':
        return this.boardService.listBoards(this.teamCode, projectId)
          .then((response) => response.success ? {items: newestFirst(response.boards), hasMore: false} : this.failedPage(response.code));
    }
  }

  private updateGroup(feature: TeamFeature, changes: Partial<ProjectItemGroup>) {
    this.groups = this.groups.map((group) => group.feature === feature ? {...group, ...changes} : group);
  }

  private failedPage(code: ErrorCode): null {
    this.toastService.show({type: ToastType.ERROR, message: errorPhrase(code)});
    return null;
  }
}

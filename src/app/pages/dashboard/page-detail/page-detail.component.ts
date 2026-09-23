import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {PageService} from "@services/page.service";
import {PageEditingService} from "@services/page-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {PageDetail, PageUser} from "@models/page.model";
import {RichTextEditorComponent} from "@components/rich-text-editor/rich-text-editor.component";

@Component({
  selector: 'app-page-detail',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    DatePipe,
    TranslateModule,
    RichTextEditorComponent
  ],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.css'
})
export class PageDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  page: PageDetail | null = null;
  mode: 'view' | 'edit' = 'view';
  draftTitle = '';
  draftContent = '';
  editingUser: PageUser | null = null;
  isLoading = true;
  alertMessage = '';

  private teamCode: string;
  private pageId = 0;

  constructor(
    private route: ActivatedRoute,
    private pageService: PageService,
    private pageEditingService: PageEditingService,
    private teamService: TeamService,
    private authService: AuthService,
    private navigationService: NavigationService,
    private translateService: TranslateService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  get showEditingBanner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.editingUser !== null && this.editingUser.id !== currentUser?.id;
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.pageId = Number(params.get('id'));
      this.loadPage();
      this.pageEditingService.connect(this.pageId, (editor) => {
        this.editingUser = editor;
      });
    });
  }

  ngOnDestroy() {
    if (this.mode === 'edit') {
      this.pageEditingService.stopEditing();
    }
    this.pageEditingService.disconnect();
  }

  handleEdit() {
    if (!this.page) {
      return;
    }

    this.draftTitle = this.page.title;
    this.draftContent = this.page.content;
    this.mode = 'edit';
    this.pageEditingService.startEditing();
  }

  handleCancel() {
    this.mode = 'view';
    this.pageEditingService.stopEditing();
  }

  handleDelete() {
    if (!this.page || !confirm(this.translateService.instant(PHRASES.CONFIRM_DELETE_PAGE))) {
      return;
    }

    this.pageService.deletePage(this.teamCode, this.page.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.handleGoBack();
      });
  }

  handleSave() {
    if (!this.page) {
      return;
    }

    this.pageService.savePage(this.teamCode, this.page.id, {title: this.draftTitle, content: this.draftContent})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.page = response.page;
        this.mode = 'view';
        this.pageEditingService.stopEditing();
      });
  }

  handleContentChange(html: string) {
    this.draftContent = html;
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES);
  }

  private loadPage() {
    this.isLoading = true;

    this.pageService.getPage(this.teamCode, this.pageId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.page = response.page;
        this.editingUser = response.page.currentlyEditing;

        const shouldStartInEditMode = this.route.snapshot.queryParamMap.get('edit') === 'true';
        if (shouldStartInEditMode) {
          this.handleEdit();
        }
      });
  }
}

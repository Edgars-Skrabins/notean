import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {CdkScrollable} from '@angular/cdk/scrolling';
import {Subscription} from 'rxjs';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH} from "@config/contentLimits";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {TeamService} from "@services/team.service";
import {ProjectService} from "@services/project.service";
import {assignableMembers} from "@utils/assignableMembers";
import {AuthService} from "@services/auth.service";
import {CommentListComponent} from "@components/comment-list/comment-list.component";
import {CommentTarget} from "@models/comment.model";
import {ToastService} from "@services/toast.service";
import {TrashService} from "@services/trash.service";
import {ToastType} from "@models/toast.model";
import {TicketDetail, TicketResponse} from "@models/ticket.model";
import {TeamMember} from "@models/team.model";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {EditConflictDialogComponent} from "@components/edit-conflict-dialog/edit-conflict-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {MoveToBoardDialogComponent} from "@components/move-to-board-dialog/move-to-board-dialog.component";
import {TicketAssigneesComponent} from "@components/ticket-assignees/ticket-assignees.component";
import {TicketTagsComponent} from "@components/ticket-tags/ticket-tags.component";
import {TagService} from "@services/tag.service";
import {Tag, TicketTagResponse} from "@models/tag.model";
import {sortTags} from "@utils/tagOrder";
import {DropdownComponent} from "@components/dropdown/dropdown.component";
import {DropdownOption} from "@models/dropdown.model";
import {errorPhrase} from "@utils/errorPhrase";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {EscapeService} from "@services/escape.service";
import {CopyLinkService} from "@services/copy-link.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {AttachmentService} from "@services/attachment.service";
import {Attachment, AttachmentUpload} from "@models/attachment.model";
import {AttachmentListComponent} from "@components/attachment-list/attachment-list.component";
import {ATTACHMENT_MAX_BYTES} from "@config/attachmentLimits";
import {droppedFiles, hasDraggedFiles, pastedFiles} from "@utils/fileDrop";
import {MentionTextEditorComponent} from "@components/mention-text-editor/mention-text-editor.component";
import {MentionContext} from "@models/mention.model";
import {stableMentionContext} from "@utils/mentionContext";

@Component({
  selector: 'app-ticket-detail',
  imports: [
    FormsModule,
    NgIf,
    CdkScrollable,
    TranslatePipe,
    IconButtonComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    EditConflictDialogComponent,
    FavoriteStarComponent,
    MoveToBoardDialogComponent,
    TicketAssigneesComponent,
    TicketTagsComponent,
    DropdownComponent,
    CommentListComponent,
    AttachmentListComponent,
    MentionTextEditorComponent
  ],
  templateUrl: './ticket-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './ticket-detail.component.css'
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;

  ticket: TicketDetail | null = null;
  titleDraft = '';
  descriptionDraft = '';
  isLoading = true;
  alertMessage = '';
  showDeleteConfirm = false;
  editConflict: { changes: { title: string } | { description: string }; latest: TicketDetail } | null = null;
  isMoveDialogOpen = false;
  members: TeamMember[] = [];
  isUpdatingAssignees = false;
  isUpdatingTags = false;
  isTitleFocused = false;
  isDescriptionFocused = false;
  uploads: AttachmentUpload[] = [];
  isDraggingFiles = false;
  readonly currentUserId: number;

  private ticketId = 0;
  commentTarget: CommentTarget | null = null;
  private isDeleting = false;
  private uploadKey = 0;
  private dragDepth = 0;
  private cachedMentionContext: MentionContext = {};
  private remoteChangesSubscription: Subscription | null = null;

  private unregisterEscape = () => {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    protected state: BoardPageStateService,
    private ticketService: TicketService,
    private tagService: TagService,
    private favoriteService: FavoriteService,
    private toastService: ToastService,
    private teamService: TeamService,
    private projectService: ProjectService,
    authService: AuthService,
    private escapeService: EscapeService,
    private copyLinkService: CopyLinkService,
    private trashService: TrashService,
    private attachmentService: AttachmentService
  ) {
    this.currentUserId = authService.getCurrentUser()?.id ?? 0;
  }

  private get teamCode(): string {
    return this.state.teamCode;
  }

  get mentionContext(): MentionContext {
    this.cachedMentionContext = stableMentionContext(this.cachedMentionContext, {boardId: this.boardId, projectId: this.state.board?.projectId ?? null});
    return this.cachedMentionContext;
  }

  private get boardId(): number {
    return this.state.boardId;
  }

  get boardTags(): Tag[] {
    return this.state.board?.tags ?? [];
  }

  get priorityOptions(): DropdownOption[] {
    return [
      {value: null, labelKey: PHRASES.NO_PRIORITY},
      ...(this.state.board?.priorities ?? []).map((priority) => ({value: priority.id, label: priority.name, color: priority.color})),
    ];
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleGoBack());
    this.ticketId = Number(this.route.snapshot.paramMap.get('ticketId'));
    this.commentTarget = {type: 'ticket', boardId: this.boardId, ticketId: this.ticketId};
    this.remoteChangesSubscription = this.state.remoteChanges$.subscribe((descriptions) => this.applyRemoteChange(descriptions));
    this.loadTicket();
    this.loadAssignableMembers();
  }

  ngOnDestroy() {
    this.unregisterEscape();
    this.remoteChangesSubscription?.unsubscribe();
  }

  applyRemoteChange(descriptions: Map<number, string>) {
    const ticket = this.ticket;
    if (!ticket || this.isDeleting || !this.state.board) {
      return;
    }

    const summary = this.state.findTicket(ticket.id);
    if (!summary) {
      this.handleGoBack();
      this.toastService.show({type: ToastType.INFO, message: PHRASES.TICKET_WAS_DELETED});
      return;
    }

    const description = descriptions.get(ticket.id) ?? ticket.description;
    const keepTitleDraft = this.isTitleFocused && this.titleDraft !== ticket.title;
    const keepDescriptionDraft = this.isDescriptionFocused && this.descriptionDraft !== ticket.description;

    this.ticket = {
      ...ticket,
      title: summary.title,
      position: summary.position,
      columnId: summary.columnId,
      priorityId: summary.priorityId,
      assignees: summary.assignees,
      tagIds: summary.tagIds,
      updatedAt: summary.updatedAt,
      attachmentCount: summary.attachmentCount,
      lockVersion: keepTitleDraft || keepDescriptionDraft ? ticket.lockVersion : summary.lockVersion,
      description,
    };
    if (!keepTitleDraft) {
      this.titleDraft = summary.title;
    }
    if (!keepDescriptionDraft) {
      this.descriptionDraft = description;
    }
    if (summary.attachmentCount !== ticket.attachments.length) {
      this.reloadAttachments();
    }
  }

  handleDragEnter(event: DragEvent) {
    if (hasDraggedFiles(event)) {
      this.dragDepth++;
      this.isDraggingFiles = true;
    }
  }

  handleDragOver(event: DragEvent) {
    if (hasDraggedFiles(event)) {
      event.preventDefault();
    }
  }

  handleDragLeave(event: DragEvent) {
    if (hasDraggedFiles(event)) {
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      this.isDraggingFiles = this.dragDepth > 0;
    }
  }

  handleDrop(event: DragEvent) {
    const files = droppedFiles(event);
    this.dragDepth = 0;
    this.isDraggingFiles = false;
    if (files.length) {
      event.preventDefault();
      this.uploadFiles(files);
    }
  }

  handlePaste(event: ClipboardEvent) {
    const files = pastedFiles(event);
    if (files.length) {
      event.preventDefault();
      this.uploadFiles(files);
    }
  }

  uploadFiles(files: File[]) {
    files.forEach((file) => this.uploadFile(file));
  }

  handleDeleteAttachment(attachment: Attachment) {
    this.attachmentService.deleteFromTicket(this.teamCode, this.boardId, this.ticketId, attachment.id)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }
        this.setAttachments((this.ticket?.attachments ?? []).filter((item) => item.id !== attachment.id));
      });
  }

  handleTitleFocus() {
    this.isTitleFocused = true;
  }

  handleTitleBlur() {
    this.isTitleFocused = false;
    this.commitTitle();
  }

  handleDescriptionFocus() {
    this.isDescriptionFocused = true;
  }

  handleDescriptionBlur() {
    this.isDescriptionFocused = false;
    this.commitDescription();
  }

  handleAddAssignee(userId: number) {
    this.updateAssignees(this.ticketService.addAssignee(this.teamCode, this.boardId, this.ticketId, userId));
  }

  handleRemoveAssignee(userId: number) {
    this.updateAssignees(this.ticketService.removeAssignee(this.teamCode, this.boardId, this.ticketId, userId));
  }

  handleGoBack() {
    this.router.navigate(['../..'], {relativeTo: this.route});
  }

  handleMoveToBacklog() {
    this.ticketService.moveToBacklog(this.teamCode, this.boardId, this.ticketId)
      .then((response) => this.applyMove(response));
  }

  handleOpenMoveDialog() {
    this.isMoveDialogOpen = true;
  }

  handleMoveCancelled() {
    this.isMoveDialogOpen = false;
  }

  handleMoveToColumn(event: { columnId: number }) {
    this.isMoveDialogOpen = false;
    this.ticketService.moveTicket(this.teamCode, this.boardId, this.ticketId, {columnId: event.columnId})
      .then((response) => this.applyMove(response));
  }

  handleCopyLink() {
    this.copyLinkService.copyCurrentLink();
  }

  handleDelete() {
    this.showDeleteConfirm = true;
  }

  handleCancelDelete() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDelete() {
    this.showDeleteConfirm = false;
    this.isDeleting = true;

    this.ticketService.deleteTicket(this.teamCode, this.boardId, this.ticketId)
      .then((response) => {
        if (!response.success) {
          this.isDeleting = false;
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.favoriteService.forgetItem('Ticket', this.ticketId);
        this.state.removeTicket(this.ticketId);
        this.trashService.notifyTrashed(this.teamCode, response.trashEntryIds);
        this.handleGoBack();
      });
  }

  commitTitle() {
    if (!this.ticket || this.editConflict) {
      return;
    }

    const title = this.titleDraft.trim();

    if (!title) {
      this.titleDraft = this.ticket.title;
      return;
    }

    if (title === this.ticket.title) {
      return;
    }

    this.saveText({title}, this.ticket.lockVersion);
  }

  cancelTitleEdit(event: Event) {
    if (this.ticket && !this.editConflict && this.titleDraft !== this.ticket.title) {
      this.titleDraft = this.ticket.title;
      event.preventDefault();
    }
  }

  commitDescription() {
    if (!this.ticket || this.editConflict) {
      return;
    }

    if (this.descriptionDraft === this.ticket.description) {
      return;
    }

    this.saveText({description: this.descriptionDraft}, this.ticket.lockVersion);
  }

  cancelDescriptionEdit(event: Event) {
    if (this.ticket && !this.editConflict && this.descriptionDraft !== this.ticket.description) {
      this.descriptionDraft = this.ticket.description;
      event.preventDefault();
    }
  }

  handleConflictLoadLatest() {
    if (!this.editConflict) {
      return;
    }

    const latest = this.editConflict.latest;
    this.editConflict = null;
    this.ticket = latest;
    this.titleDraft = latest.title;
    this.descriptionDraft = latest.description;
    this.favoriteService.renameItem('Ticket', latest.id, latest.title);
    this.state.updateTicket(latest);
  }

  handleConflictOverwrite() {
    if (!this.editConflict) {
      return;
    }

    const {changes, latest} = this.editConflict;
    this.editConflict = null;
    this.saveText(changes, latest.lockVersion);
  }

  handleConflictCancel() {
    this.editConflict = null;
  }

  handleAddTag(tagId: number) {
    this.updateTags(this.tagService.addToTicket(this.teamCode, this.boardId, this.ticketId, tagId));
  }

  handleRemoveTag(tagId: number) {
    this.updateTags(this.tagService.removeFromTicket(this.teamCode, this.boardId, this.ticketId, tagId));
  }

  handleCreateTag(name: string) {
    this.isUpdatingTags = true;
    this.tagService.create(this.teamCode, this.boardId, name)
      .then((response) => {
        if (!response.success) {
          this.isUpdatingTags = false;
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }

        this.state.setTags(sortTags([...this.boardTags.filter((tag) => tag.id !== response.tag.id), response.tag]));
        this.handleAddTag(response.tag.id);
      });
  }

  handlePriorityChange(value: string | number | null) {
    const priorityId = value === null ? null : Number(value);
    this.ticketService.updateTicket(this.teamCode, this.boardId, this.ticketId, {priorityId})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        this.state.updateTicket(response.ticket);
      });
  }

  private saveText(changes: { title: string } | { description: string }, lockVersion: number) {
    this.ticketService.updateTicket(this.teamCode, this.boardId, this.ticketId, {...changes, lockVersion})
      .then((response) => {
        if ('latest' in response) {
          this.editConflict = {changes, latest: response.latest};
          return;
        }

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        if ('description' in changes) {
          this.descriptionDraft = response.ticket.description;
          return;
        }

        this.titleDraft = response.ticket.title;
        this.favoriteService.renameItem('Ticket', response.ticket.id, response.ticket.title);
        this.state.updateTicket(response.ticket);
      });
  }

  private async uploadFile(file: File) {
    if (file.size > ATTACHMENT_MAX_BYTES) {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase('FILE_TOO_LARGE')});
      return;
    }

    const upload: AttachmentUpload = {key: ++this.uploadKey, filename: file.name, progress: 0};
    this.uploads = [...this.uploads, upload];
    const response = await this.attachmentService.uploadToTicket(this.teamCode, this.boardId, this.ticketId, file, (progress) => {
      upload.progress = progress;
    });
    this.uploads = this.uploads.filter((item) => item !== upload);

    if (!response.success) {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
      return;
    }
    this.setAttachments([response.attachment, ...(this.ticket?.attachments ?? [])]);
  }

  private setAttachments(attachments: Attachment[]) {
    if (!this.ticket) {
      return;
    }
    this.ticket = {...this.ticket, attachments, attachmentCount: attachments.length};
    this.state.setAttachmentCount(this.ticket.id, attachments.length);
  }

  private reloadAttachments() {
    this.ticketService.getTicket(this.teamCode, this.boardId, this.ticketId)
      .then((response) => {
        if (response.success && this.ticket) {
          this.ticket = {...this.ticket, attachments: response.ticket.attachments, attachmentCount: response.ticket.attachments.length};
        }
      });
  }

  private loadAssignableMembers() {
    const projectId = this.state.board?.projectId ?? null;
    Promise.all([
      this.teamService.fetchTeamMembers(this.teamCode),
      projectId === null ? Promise.resolve(null) : this.projectService.getProject(this.teamCode, projectId),
    ]).then(([members, projectResponse]) => {
      const projectMemberIds = projectResponse?.success ? projectResponse.project.members.map((member) => member.id) : null;
      this.members = assignableMembers(members, projectId === null ? null : projectMemberIds ?? []);
    });
  }

  private updateAssignees(request: Promise<TicketResponse>) {
    this.isUpdatingAssignees = true;

    request
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.ASSIGNEES_UPDATE_FAILED});
          return;
        }

        this.ticket = response.ticket;
        this.state.updateTicket(response.ticket);
      })
      .finally(() => {
        this.isUpdatingAssignees = false;
      });
  }

  private updateTags(request: Promise<TicketTagResponse>) {
    this.isUpdatingTags = true;

    request
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }

        this.ticket = response.ticket;
        this.state.updateTicket(response.ticket);
      })
      .finally(() => {
        this.isUpdatingTags = false;
      });
  }

  private applyMove(response: TicketResponse) {
    if (!response.success) {
      this.toastService.show({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
      return;
    }

    this.ticket = response.ticket;
    this.state.placeTicket(response.ticket);
  }

  private loadTicket() {
    this.isLoading = true;

    this.ticketService.getTicket(this.teamCode, this.boardId, this.ticketId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          if (response.code === 'TICKET_NOT_FOUND') {
            this.router.navigate([AppRoutes.UNAVAILABLE], {replaceUrl: true});
            return;
          }
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.ticket = response.ticket;
        this.titleDraft = response.ticket.title;
        this.descriptionDraft = response.ticket.description;
      });
  }
}

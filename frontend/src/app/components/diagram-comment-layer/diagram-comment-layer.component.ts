import {Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {CdkConnectedOverlay, OverlayModule} from '@angular/cdk/overlay';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {SIDE_POSITIONS} from '@config/overlayPositions';
import {ErrorCode} from '@config/errorCodes';
import {Comment, CommentPin, CommentTarget} from '@models/comment.model';
import {CommentService} from '@services/comment.service';
import {EscapeService} from '@services/escape.service';
import {TeamService} from '@services/team.service';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {ButtonComponent} from '@components/button/button.component';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';
import {CommentListComponent} from '@components/comment-list/comment-list.component';
import {FlowchartEditorComponent} from '@components/flowchart-editor/flowchart-editor.component';
import {RichTextEditorComponent} from '@components/rich-text-editor/rich-text-editor.component';
import {errorPhrase} from '@utils/errorPhrase';
import {commentExcerpt, hasCommentText} from '@utils/commentText';

type PanelOrigin = Element | { x: number; y: number; width: number; height: number };

const MARKER_SIZE = 32;

interface PinDraft {
  x: number;
  y: number;
}

@Component({
  selector: 'app-diagram-comment-layer',
  imports: [
    NgFor,
    NgIf,
    OverlayModule,
    TranslatePipe,
    AvatarComponent,
    ButtonComponent,
    CheckboxComponent,
    CommentListComponent,
    RichTextEditorComponent
  ],
  templateUrl: './diagram-comment-layer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './diagram-comment-layer.component.css'
})
export class DiagramCommentLayerComponent implements OnChanges, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly SIDE_POSITIONS = SIDE_POSITIONS;

  @Input({required: true}) diagramId!: number;
  @Input({required: true}) editor!: FlowchartEditorComponent;

  @ViewChild(CdkConnectedOverlay) panelOverlay?: CdkConnectedOverlay;

  pins: CommentPin[] = [];
  showResolved = false;
  isPlacing = false;
  draft: PinDraft | null = null;
  draftBody = '';
  isPosting = false;
  openPinId: number | null = null;
  openTarget: CommentTarget | null = null;
  panelOrigin: PanelOrigin | null = null;
  alertMessage = '';

  private readonly teamCode: string;
  private unregisterEscape: (() => void) | null = null;

  constructor(
    private commentService: CommentService,
    private escapeService: EscapeService,
    teamService: TeamService
  ) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['diagramId']) {
      this.loadPins();
    }
  }

  ngOnDestroy() {
    this.releaseEscape();
  }

  get visiblePins(): CommentPin[] {
    return this.pins.filter((pin) => this.showResolved || pin.resolvedAt === null || pin.id === this.openPinId);
  }

  get openPin(): CommentPin | null {
    return this.pins.find((pin) => pin.id === this.openPinId) ?? null;
  }

  get canPostDraft(): boolean {
    return !this.isPosting && hasCommentText(this.draftBody);
  }

  trackById(_index: number, pin: CommentPin): number {
    return pin.id;
  }

  position(point: { x: number; y: number }): { x: number; y: number } {
    return this.editor.localToCanvas(point.x, point.y) ?? point;
  }

  excerpt(pin: CommentPin): string {
    return pin.firstComment ? commentExcerpt(pin.firstComment.body) : '';
  }

  refresh() {
    this.panelOverlay?.overlayRef?.updatePosition();
  }

  refreshAfterRender() {
    setTimeout(() => this.refresh());
  }

  startPlacing() {
    this.closePanel();
    this.isPlacing = true;
    this.holdEscape();
  }

  stopPlacing() {
    this.isPlacing = false;
    this.releaseEscape();
  }

  handlePlacementClick(event: MouseEvent) {
    const point = this.editor.clientToLocal(event.clientX, event.clientY);
    this.isPlacing = false;
    if (!point) {
      this.releaseEscape();
      return;
    }

    this.draft = point;
    this.draftBody = '';
    this.alertMessage = '';
    this.panelOrigin = {x: event.clientX, y: event.clientY - MARKER_SIZE, width: MARKER_SIZE, height: MARKER_SIZE};
  }

  openPinPanel(pin: CommentPin, marker: Element) {
    if (this.openPinId === pin.id) {
      this.closePanel();
      return;
    }

    this.draft = null;
    this.alertMessage = '';
    this.openPinId = pin.id;
    this.openTarget = {type: 'commentPin', pinId: pin.id};
    this.panelOrigin = marker;
    this.holdEscape();
  }

  closePanel() {
    this.openPinId = null;
    this.openTarget = null;
    this.draft = null;
    this.panelOrigin = null;
    this.isPlacing = false;
    this.releaseEscape();
  }

  async postDraft() {
    if (!this.draft || !this.canPostDraft) {
      return;
    }

    this.isPosting = true;
    const response = await this.commentService.createPin(this.teamCode, this.diagramId, this.draft.x, this.draft.y, this.draftBody);
    this.isPosting = false;

    if (response.success) {
      this.pins = [...this.pins, response.commentPin];
      this.closePanel();
    } else {
      this.showError(response.code);
    }
  }

  async toggleResolved(pin: CommentPin) {
    const response = await this.commentService.setPinResolved(this.teamCode, pin.id, pin.resolvedAt === null);

    if (response.success) {
      this.replacePin(response.commentPin);
      if (response.commentPin.resolvedAt !== null && !this.showResolved) {
        this.closePanel();
      }
    } else if (response.code === 'COMMENT_PIN_NOT_FOUND') {
      this.removePin(pin.id);
    } else {
      this.showError(response.code);
    }
  }

  handleCommentAdded(pin: CommentPin) {
    this.replacePin({...pin, commentCount: pin.commentCount + 1});
  }

  handleCommentUpdated(pin: CommentPin, comment: Comment) {
    if (pin.firstComment?.id === comment.id) {
      this.replacePin({...pin, firstComment: comment});
    }
  }

  handleCommentRemoved(pin: CommentPin, comment: Comment) {
    this.replacePin({...pin, commentCount: Math.max(pin.commentCount - 1, 0)});
    if (pin.firstComment?.id === comment.id) {
      this.loadPins();
    }
  }

  removePin(pinId: number) {
    this.pins = this.pins.filter((pin) => pin.id !== pinId);
    if (this.openPinId === pinId) {
      this.closePanel();
    }
  }

  private async loadPins() {
    const diagramId = this.diagramId;
    const response = await this.commentService.listPins(this.teamCode, diagramId);
    if (diagramId !== this.diagramId) {
      return;
    }

    if (response.success) {
      this.pins = response.commentPins;
    } else {
      this.showError(response.code);
    }
  }

  private replacePin(updated: CommentPin) {
    this.pins = this.pins.map((pin) => pin.id === updated.id ? updated : pin);
  }

  private showError(code: ErrorCode) {
    this.alertMessage = errorPhrase(code);
  }

  private holdEscape() {
    if (!this.unregisterEscape) {
      this.unregisterEscape = this.escapeService.push(() => this.closePanel());
    }
  }

  private releaseEscape() {
    this.unregisterEscape?.();
    this.unregisterEscape = null;
  }
}

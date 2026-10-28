import {SimpleChange} from '@angular/core';
import {DiagramCommentLayerComponent} from './diagram-comment-layer.component';
import {CommentService} from '@services/comment.service';
import {TeamService} from '@services/team.service';
import {FlowchartEditorComponent} from '@components/flowchart-editor/flowchart-editor.component';
import {CommentPin} from '@models/comment.model';
import {escapeServiceStub, EscapeServiceStub} from '../../testing/escapeServiceStub';

const bob = {id: 2, nickname: 'Bob', avatar: {color: 'blue' as const, imageUrl: null}};

function pin(id: number, resolvedAt: string | null = null): CommentPin {
  return {id, x: 10, y: 20, resolvedAt, resolvedBy: null, createdBy: bob, commentCount: 1, firstComment: null};
}

describe('DiagramCommentLayerComponent', () => {
  let component: DiagramCommentLayerComponent;
  let commentService: jasmine.SpyObj<CommentService>;
  let escape: EscapeServiceStub;

  beforeEach(async () => {
    commentService = jasmine.createSpyObj<CommentService>('CommentService', ['listPins', 'createPin', 'setPinResolved']);
    commentService.listPins.and.resolveTo({success: true, commentPins: [pin(1), pin(2, '2026-10-28T10:00:00Z')]});
    escape = escapeServiceStub();
    const teamService = {getCurrentTeamCode: () => 'abc'} as unknown as TeamService;
    component = new DiagramCommentLayerComponent(commentService, escape.service, teamService);
    component.editor = {clientToLocal: (x: number, y: number) => ({x: x / 2, y: y / 2})} as unknown as FlowchartEditorComponent;
    component.diagramId = 8;
    component.ngOnChanges({diagramId: new SimpleChange(undefined, 8, true)});
    await commentService.listPins.calls.mostRecent().returnValue;
  });

  it('hides resolved pins unless they are shown', () => {
    expect(component.visiblePins.map((item) => item.id)).toEqual([1]);

    component.showResolved = true;

    expect(component.visiblePins.map((item) => item.id)).toEqual([1, 2]);
  });

  it('creates a pin at the clicked graph point', async () => {
    commentService.createPin.and.resolveTo({success: true, commentPin: pin(3), comment: pin(1).firstComment!});
    component.startPlacing();

    component.handlePlacementClick(new MouseEvent('click', {clientX: 100, clientY: 60}));
    component.draftBody = '<p>Look here</p>';
    await component.postDraft();

    expect(commentService.createPin).toHaveBeenCalledWith('abc', 8, 50, 30, '<p>Look here</p>');
    expect(component.pins.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(component.draft).toBeNull();
  });

  it('leaves placement mode on Esc', () => {
    component.startPlacing();

    escape.press();

    expect(component.isPlacing).toBeFalse();
    expect(escape.handlers.length).toBe(0);
  });

  it('hides a pin once it is resolved', async () => {
    commentService.setPinResolved.and.resolveTo({success: true, commentPin: pin(1, '2026-10-28T11:00:00Z')});
    component.openPinPanel(component.pins[0], document.createElement('button'));

    await component.toggleResolved(component.pins[0]);

    expect(commentService.setPinResolved).toHaveBeenCalledWith('abc', 1, true);
    expect(component.openPinId).toBeNull();
    expect(component.visiblePins).toEqual([]);
  });

  it('removes a pin whose last comment was deleted', () => {
    component.openPinPanel(component.pins[0], document.createElement('button'));

    component.removePin(1);

    expect(component.pins.map((item) => item.id)).toEqual([2]);
    expect(component.openPinId).toBeNull();
  });
});

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {RichTextEditorComponent} from './rich-text-editor.component';
import {AttachmentService} from '@services/attachment.service';
import {MentionService} from '@services/mention.service';
import {TeamService} from '@services/team.service';

describe('RichTextEditorComponent', () => {
  let fixture: ComponentFixture<RichTextEditorComponent>;
  let attachmentService: jasmine.SpyObj<AttachmentService>;

  function keydown(key: string, keyCode: number): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key, keyCode, bubbles: true, cancelable: true});
    fixture.nativeElement.querySelector('.ProseMirror').dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    attachmentService = jasmine.createSpyObj<AttachmentService>('AttachmentService', ['objectUrl']);
    attachmentService.objectUrl.and.returnValue(Promise.resolve({success: true, url: 'blob:image'}));
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent],
      providers: [provideTranslateService(), {provide: AttachmentService, useValue: attachmentService}, {provide: TeamService, useValue: {getCurrentTeamCode: () => 'T1'}}],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentInstance.content = '<p>Hi</p>';
    fixture.componentInstance.editable = true;
    fixture.detectChanges();
  });

  afterEach(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    fixture.destroy();
  });

  it('leaves Escape unhandled so it reaches the popup', () => {
    expect(keydown('Escape', 27).defaultPrevented).toBeFalse();
  });

  it('still handles Enter itself', () => {
    expect(keydown('Enter', 13).defaultPrevented).toBeTrue();
  });

  function selectAllAnd(action: () => void): string {
    const component = fixture.componentInstance;
    component.editor!.commands.selectAll();
    action();
    return component.editor!.getHTML();
  }

  it('produces the same HTML for each toolbar action', () => {
    const component = fixture.componentInstance;

    expect(selectAllAnd(() => component.toggleBold())).toBe('<p><strong>Hi</strong></p>');
    expect(selectAllAnd(() => component.toggleBold())).toBe('<p>Hi</p>');
    expect(selectAllAnd(() => component.toggleItalic())).toBe('<p><em>Hi</em></p>');
    expect(selectAllAnd(() => component.toggleItalic())).toBe('<p>Hi</p>');
    expect(selectAllAnd(() => component.toggleHeading())).toBe('<h2>Hi</h2>');
    expect(selectAllAnd(() => component.toggleHeading())).toBe('<p>Hi</p>');
    expect(selectAllAnd(() => component.toggleBulletList())).toBe('<ul><li><p>Hi</p></li></ul>');
    expect(selectAllAnd(() => component.toggleBulletList())).toBe('<p>Hi</p>');
    expect(selectAllAnd(() => component.toggleOrderedList())).toBe('<ol><li><p>Hi</p></li></ol>');
  });

  it('does not underline or link text', () => {
    const component = fixture.componentInstance;
    const target = fixture.nativeElement.querySelector('.ProseMirror');

    component.editor!.commands.selectAll();
    target.dispatchEvent(new KeyboardEvent('keydown', {key: 'u', ctrlKey: true, bubbles: true, cancelable: true}));
    target.dispatchEvent(new KeyboardEvent('keydown', {key: 'u', metaKey: true, bubbles: true, cancelable: true}));

    expect(component.editor!.getHTML()).toBe('<p>Hi</p>');
    const names = component.editor!.extensionManager.extensions.map((extension) => extension.name);
    expect(names).not.toContain('underline');
    expect(names).not.toContain('link');
    expect(names).not.toContain('listKeymap');
    expect(names).not.toContain('trailingNode');
  });

  describe('attachment images', () => {
    function paste(...files: File[]): ClipboardEvent {
      const data = new DataTransfer();
      files.forEach((file) => data.items.add(file));
      const event = new ClipboardEvent('paste', {clipboardData: data, bubbles: true, cancelable: true});
      fixture.nativeElement.querySelector('.ProseMirror').dispatchEvent(event);
      return event;
    }

    it('keeps the attachment id and alt and drops any src', () => {
      const component = fixture.componentInstance;

      component.editor!.commands.setContent('<p>Hi</p><img data-attachment-id="12" alt="Chart" src="https://example.com/x.png"><img src="https://example.com/y.png">');

      expect(component.editor!.getHTML()).toBe('<p>Hi</p><img data-attachment-id="12" alt="Chart">');
    });

    it('shows the image through the attachment service', fakeAsync(() => {
      fixture.componentInstance.teamCode = 'ABC';
      fixture.componentInstance.editor!.commands.setContent('<img data-attachment-id="12">');
      flushMicrotasks();

      expect(attachmentService.objectUrl).toHaveBeenCalledWith('ABC', 12);
      expect(fixture.nativeElement.querySelector('.attachmentImage__image').getAttribute('src')).toBe('blob:image');
    }));

    it('uploads a pasted image and swaps the placeholder for the attachment', fakeAsync(() => {
      const component = fixture.componentInstance;
      let finish: (id: number | null) => void = () => undefined;
      component.uploadImage = () => new Promise((resolve) => finish = resolve);
      component.editor!.commands.setContent('');

      const event = paste(new File(['x'], 'shot.png', {type: 'image/png'}));
      expect(event.defaultPrevented).toBeTrue();
      expect(component.editor!.getHTML()).toContain('<img alt="shot.png">');

      finish(44);
      flushMicrotasks();
      expect(component.editor!.getHTML()).toContain('<img data-attachment-id="44" alt="shot.png">');
    }));

    it('removes the placeholder when the upload fails', fakeAsync(() => {
      const component = fixture.componentInstance;
      component.uploadImage = () => Promise.resolve(null);
      component.editor!.commands.setContent('<p>Hi</p>');

      paste(new File(['x'], 'shot.png', {type: 'image/png'}));
      flushMicrotasks();

      expect(component.editor!.getHTML()).not.toContain('img');
    }));

    it('hands other pasted files to the page instead of inserting them', () => {
      const component = fixture.componentInstance;
      component.uploadImage = jasmine.createSpy('uploadImage');
      const dropped = jasmine.createSpy('filesDropped');
      component.filesDropped.subscribe(dropped);
      const file = new File(['x'], 'notes.txt', {type: 'text/plain'});

      paste(file);

      expect(dropped).toHaveBeenCalledWith([file]);
      expect(component.uploadImage).not.toHaveBeenCalled();
    });
  });

  describe('mentions', () => {
    const MENTION = '<span data-type="mention" data-id="4" data-label="Spec" data-mention-type="page">@Spec</span>';

    function create(mentionContext: { projectId: number } | null): RichTextEditorComponent {
      fixture.destroy();
      fixture = TestBed.createComponent(RichTextEditorComponent);
      fixture.componentInstance.content = `<p>See ${MENTION}</p>`;
      fixture.componentInstance.mentionContext = mentionContext;
      fixture.detectChanges();
      return fixture.componentInstance;
    }

    beforeEach(() => {
      const mentionService = TestBed.inject(MentionService);
      spyOn(mentionService, 'resolve').and.returnValue(Promise.resolve({type: 'page', id: 4, status: 'ok', title: 'Spec v2'}));
    });

    it('keeps mention nodes and renders them as chips when a context is set', fakeAsync(() => {
      const component = create({projectId: 1});
      flushMicrotasks();

      expect(component.editor!.getHTML()).toBe(`<p>See ${MENTION}</p>`);
      expect(fixture.nativeElement.querySelector('.mentionChip').textContent).toContain('Spec v2');
    }));

    it('has no mention node without a context', () => {
      const component = create(null);

      expect(component.editor!.getHTML()).toBe('<p>See @Spec</p>');
    });
  });
});

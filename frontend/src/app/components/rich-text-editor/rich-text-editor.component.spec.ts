import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {RichTextEditorComponent} from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
  let fixture: ComponentFixture<RichTextEditorComponent>;

  function keydown(key: string, keyCode: number): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key, keyCode, bubbles: true, cancelable: true});
    fixture.nativeElement.querySelector('.ProseMirror').dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentInstance.content = '<p>Hi</p>';
    fixture.componentInstance.editable = true;
    fixture.detectChanges();
  });

  afterEach(() => {
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
});

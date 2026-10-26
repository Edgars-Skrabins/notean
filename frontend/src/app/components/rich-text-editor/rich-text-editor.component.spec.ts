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
});

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {MentionTextEditorComponent} from './mention-text-editor.component';
import {MentionService} from '@services/mention.service';
import {TeamService} from '@services/team.service';

describe('MentionTextEditorComponent', () => {
  let fixture: ComponentFixture<MentionTextEditorComponent>;
  let component: MentionTextEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionTextEditorComponent],
      providers: [provideTranslateService(), {provide: TeamService, useValue: {getCurrentTeamCode: () => 'T1'}}],
    }).compileComponents();
    spyOn(TestBed.inject(MentionService), 'resolve').and.returnValue(new Promise(() => undefined));
    fixture = TestBed.createComponent(MentionTextEditorComponent);
    component = fixture.componentInstance;
    component.value = 'Ask @[user:3|Ann]';
    component.maxLength = 30;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders tokens as chips and emits token text on edits', () => {
    const emitted = jasmine.createSpy('valueChange');
    component.valueChange.subscribe(emitted);

    expect(fixture.nativeElement.querySelector('.mentionChip').textContent).toContain('@Ann');
    component.editor!.commands.insertContentAt(component.editor!.state.doc.content.size - 1, ' now');

    expect(emitted).toHaveBeenCalledWith('Ask @[user:3|Ann] now');
  });

  it('applies outside value changes and keeps the chips', () => {
    component.value = 'Line one\n@[user:4|Bea]';
    component.ngOnChanges({value: {currentValue: component.value, previousValue: '', firstChange: false, isFirstChange: () => false}});

    expect(fixture.nativeElement.querySelectorAll('.ProseMirror p').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.mentionChip').textContent).toContain('@Bea');
  });

  it('rejects edits beyond the maximum length', () => {
    component.editor!.commands.insertContentAt(1, 'This is far too long ');

    expect(component.editor!.getText()).toBe('Ask @Ann');
  });

  describe('accessible name', () => {
    function label(): string | null {
      return fixture.nativeElement.querySelector('.ProseMirror').getAttribute('aria-label');
    }

    it('prefers the explicit label over the placeholder', () => {
      fixture.componentRef.setInput('placeholder', 'Add a description...');
      fixture.componentRef.setInput('ariaLabel', 'Description');
      fixture.detectChanges();

      expect(label()).toBe('Description');
    });

    it('falls back to the placeholder and follows its changes', () => {
      fixture.componentRef.setInput('placeholder', 'Message #general');
      fixture.detectChanges();
      expect(label()).toBe('Message #general');

      fixture.componentRef.setInput('placeholder', 'Message #random');
      fixture.detectChanges();
      expect(label()).toBe('Message #random');
    });
  });

  it('emits escape when no dropdown handled it', () => {
    const escaped = jasmine.createSpy('escape');
    component.escape.subscribe(escaped);

    fixture.nativeElement.querySelector('.ProseMirror').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));

    expect(escaped).toHaveBeenCalled();
  });
});

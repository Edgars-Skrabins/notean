import {ComponentFixture, TestBed, fakeAsync, flush, flushMicrotasks} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {TeamCodeDisplayComponent} from './team-code-display.component';
import {PHRASES} from '@config/phrases';

describe('TeamCodeDisplayComponent', () => {
  let fixture: ComponentFixture<TeamCodeDisplayComponent>;

  function render(compact?: boolean) {
    fixture = TestBed.createComponent(TeamCodeDisplayComponent);
    fixture.componentRef.setInput('code', 'abc123');
    if (compact !== undefined) {
      fixture.componentRef.setInput('compact', compact);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamCodeDisplayComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('applies the compact class only when compact is set', () => {
    expect(render().querySelector('.teamCodeDisplay--compact')).toBeNull();
    fixture.destroy();
    expect(render(true).querySelector('.teamCodeDisplay--compact')).not.toBeNull();
  });

  it('labels the copy button with aria-label and no native title', () => {
    const button = render().querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe(PHRASES.COPY_CODE);
    expect(button.hasAttribute('title')).toBeFalse();
  });

  it('copies the code and switches the label to the copied text', fakeAsync(() => {
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    const button = render().querySelector('button') as HTMLButtonElement;

    button.click();
    flushMicrotasks();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledOnceWith('abc123');
    expect(button.getAttribute('aria-label')).toBe(PHRASES.CODE_COPIED);
    flush();
  }));
});

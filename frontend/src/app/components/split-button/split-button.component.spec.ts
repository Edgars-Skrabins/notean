import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {SplitButtonComponent} from './split-button.component';

describe('SplitButtonComponent', () => {
  let fixture: ComponentFixture<SplitButtonComponent>;
  let component: SplitButtonComponent;
  let pressed: number;
  let picked: (string | number | null)[];

  function main(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.splitButton__main');
  }

  function toggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.splitButton__toggle');
  }

  function menuOptions(): HTMLButtonElement[] {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('.menuButton__option'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SplitButtonComponent],
      providers: [provideTranslateService()]
    });
    fixture = TestBed.createComponent(SplitButtonComponent);
    component = fixture.componentInstance;
    component.label = 'New page';
    component.menuLabel = 'Creation options';
    component.icon = 'plus';
    component.options = [{value: 'blank', label: 'Blank'}, {value: 'template', label: 'From template'}];
    pressed = 0;
    picked = [];
    component.pressed.subscribe(() => pressed++);
    component.picked.subscribe((value) => picked.push(value));
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('emits pressed from the main part without opening the menu', () => {
    main().click();
    fixture.detectChanges();

    expect(pressed).toBe(1);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(menuOptions().length).toBe(0);
  });

  it('opens the menu from the chevron and emits the picked option', () => {
    toggle().click();
    fixture.detectChanges();

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(menuOptions().map((option) => option.textContent?.trim())).toEqual(['Blank', 'From template']);

    menuOptions()[1].click();
    fixture.detectChanges();

    expect(picked).toEqual(['template']);
    expect(pressed).toBe(0);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('neither emits nor opens while disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    main().click();
    toggle().click();
    fixture.nativeElement.querySelector('.menuButton__custom').click();
    fixture.detectChanges();

    expect(pressed).toBe(0);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(menuOptions().length).toBe(0);
  });

  it('names the icon-only main part with the label in compact mode', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    expect(main().getAttribute('aria-label')).toBe('New page');
    expect(main().textContent?.trim()).toBe('');
    expect(toggle().getAttribute('aria-label')).toBe('Creation options');
  });
});

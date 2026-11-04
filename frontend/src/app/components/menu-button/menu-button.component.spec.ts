import {ComponentFixture, TestBed} from '@angular/core/testing';
import {OverlayContainer} from '@angular/cdk/overlay';
import {provideTranslateService} from '@ngx-translate/core';
import {MenuButtonComponent} from './menu-button.component';

describe('MenuButtonComponent', () => {
  let fixture: ComponentFixture<MenuButtonComponent>;
  let overlayElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuButtonComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    overlayElement = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(MenuButtonComponent);
    fixture.componentRef.setInput('label', 'Actions');
    fixture.componentRef.setInput('options', [
      {value: 'rename', label: 'Rename'},
      {value: 'delete', label: 'Delete'},
    ]);
    fixture.detectChanges();
  });

  function openMenu(): HTMLElement {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.menuButton__trigger');
    trigger.click();
    fixture.detectChanges();
    return trigger;
  }

  it('returns focus to the trigger before emitting the picked option', () => {
    const trigger = openMenu();
    let focusedOnPick: Element | null = null;
    let picked: string | number | null = null;
    fixture.componentInstance.picked.subscribe(value => {
      focusedOnPick = document.activeElement;
      picked = value;
    });

    const options = overlayElement.querySelectorAll<HTMLButtonElement>('.menuButton__option');
    options[1].focus();
    options[1].click();
    fixture.detectChanges();

    expect(picked as string | number | null).toBe('delete');
    expect(focusedOnPick as Element | null).toBe(trigger);
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the trigger when Esc closes the panel', () => {
    const trigger = openMenu();
    const panel = overlayElement.querySelector<HTMLElement>('.menuButton__panel')!;
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});

    panel.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.isOpen).toBeFalse();
    expect(document.activeElement).toBe(trigger);
  });
});

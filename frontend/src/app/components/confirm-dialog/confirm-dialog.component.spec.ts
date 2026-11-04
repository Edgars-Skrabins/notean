import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {ConfirmDialogComponent} from './confirm-dialog.component';
import {EscapeService} from '@services/escape.service';
import {escapeServiceStub} from '../../testing/escapeServiceStub';

describe('ConfirmDialogComponent', () => {
  let opener: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideTranslateService(),
        {provide: EscapeService, useValue: escapeServiceStub().service},
      ],
    }).compileComponents();

    opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
  });

  afterEach(() => {
    opener.remove();
  });

  async function createDialog(): Promise<ComponentFixture<ConfirmDialogComponent>> {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('message', 'Delete this page?');
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('is an alert dialog labelled by its message', async () => {
    const fixture = await createDialog();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.confirmDialog');
    const message: HTMLElement = fixture.nativeElement.querySelector('.confirmDialog__message');

    expect(panel.getAttribute('role')).toBe('alertdialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(message.id).toBeTruthy();
    expect(panel.getAttribute('aria-labelledby')).toBe(message.id);
  });

  it('focuses Cancel when it opens', async () => {
    const fixture = await createDialog();
    const cancel: HTMLButtonElement = fixture.nativeElement.querySelector('.confirmDialog__actions app-button button');

    expect(document.activeElement).toBe(cancel);
  });

  it('returns focus to the element focused before it opened', async () => {
    const fixture = await createDialog();

    fixture.destroy();

    expect(document.activeElement).toBe(opener);
  });
});

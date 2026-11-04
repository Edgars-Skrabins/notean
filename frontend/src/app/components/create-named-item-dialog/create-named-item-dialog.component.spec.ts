import {TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {CreateNamedItemDialogComponent} from './create-named-item-dialog.component';
import {EscapeService} from '@services/escape.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {TITLE_MAX_LENGTH} from '@config/contentLimits';
import {escapeServiceStub} from '../../testing/escapeServiceStub';
import {projectFilterStub} from '../../testing/projectFilterStub';

describe('CreateNamedItemDialogComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateNamedItemDialogComponent],
      providers: [
        provideTranslateService(),
        {provide: EscapeService, useValue: escapeServiceStub().service},
        {provide: ProjectFilterService, useValue: projectFilterStub().service},
      ],
    }).compileComponents();
  });

  it('limits the title input to the title length limit', () => {
    const fixture = TestBed.createComponent(CreateNamedItemDialogComponent);
    fixture.componentRef.setInput('dialogTitle', 'New board');
    fixture.componentRef.setInput('defaultValue', 'Untitled');
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.createNamedItemDialog__input');
    expect(input.maxLength).toBe(TITLE_MAX_LENGTH);
  });

  it('marks the title input invalid and points it at the announced error', () => {
    const fixture = TestBed.createComponent(CreateNamedItemDialogComponent);
    fixture.componentRef.setInput('dialogTitle', 'New board');
    fixture.componentRef.setInput('errorMessage', 'ERRORS.BOARDS.BOARD_CREATE_FAILED');
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.createNamedItemDialog__input');
    const error = fixture.nativeElement.querySelector('#' + input.getAttribute('aria-describedby'));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent.trim()).toBe('ERRORS.BOARDS.BOARD_CREATE_FAILED');
  });

  it('leaves the title input without error attributes when there is no error', () => {
    const fixture = TestBed.createComponent(CreateNamedItemDialogComponent);
    fixture.componentRef.setInput('dialogTitle', 'New board');
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.createNamedItemDialog__input');
    expect(input.hasAttribute('aria-invalid')).toBeFalse();
    expect(input.hasAttribute('aria-describedby')).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('is a dialog named by its title that focuses the name input', async () => {
    const fixture = TestBed.createComponent(CreateNamedItemDialogComponent);
    fixture.componentRef.setInput('dialogTitle', 'New board');
    fixture.componentRef.setInput('defaultValue', 'Untitled');
    fixture.detectChanges();
    await fixture.whenStable();

    const panel: HTMLElement = fixture.nativeElement.querySelector('.createNamedItemDialog');
    const title: HTMLElement = fixture.nativeElement.querySelector('.createNamedItemDialog__title');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.createNamedItemDialog__input');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id);
    expect(input.getAttribute('aria-labelledby')).toBe(title.id);
    expect(document.activeElement).toBe(input);
  });
});

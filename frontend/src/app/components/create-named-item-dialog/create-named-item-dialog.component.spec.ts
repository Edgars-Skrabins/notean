import {TestBed} from '@angular/core/testing';
import {TranslateModule} from '@ngx-translate/core';
import {CreateNamedItemDialogComponent} from './create-named-item-dialog.component';
import {EscapeService} from '@services/escape.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {TITLE_MAX_LENGTH} from '@config/contentLimits';
import {escapeServiceStub} from '../../testing/escapeServiceStub';
import {projectFilterStub} from '../../testing/projectFilterStub';

describe('CreateNamedItemDialogComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateNamedItemDialogComponent, TranslateModule.forRoot()],
      providers: [
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
});

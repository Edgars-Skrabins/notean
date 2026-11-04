import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService, TranslatePipe} from '@ngx-translate/core';
import {BoardSettingsTabComponent} from './board-settings-tab.component';

describe('BoardSettingsTabComponent', () => {
  let fixture: ComponentFixture<BoardSettingsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardSettingsTabComponent],
      providers: [provideTranslateService()],
    })
      .overrideComponent(BoardSettingsTabComponent, {set: {imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
    fixture = TestBed.createComponent(BoardSettingsTabComponent);
    fixture.detectChanges();
  });

  it('shows the priority and tag lists under their headings', () => {
    const element: HTMLElement = fixture.nativeElement;
    const headings = Array.from(element.querySelectorAll('.boardSettings__heading')).map((heading) => heading.textContent!.trim());

    expect(headings).toEqual(['PRIORITIES', 'TAGS']);
    expect(element.querySelector('app-priority-list')).not.toBeNull();
    expect(element.querySelector('app-tag-list')).not.toBeNull();
  });
});

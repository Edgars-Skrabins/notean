import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideTranslateService, TranslateService} from '@ngx-translate/core';
import {EmptyStateComponent} from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state [title]="title" [titleParams]="{query: 'abc'}" [hint]="hint" [hintParams]="{project: 'Apollo'}">
      <button type="button" class="action">Clear search</button>
    </app-empty-state>
  `
})
class HostComponent {
  title = 'TITLE';
  hint = 'HINT';
}

describe('EmptyStateComponent', () => {
  function render(setup: (host: HostComponent) => void = () => {}) {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideTranslateService()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {TITLE: "Nothing matches '{{query}}'", HINT: "Only '{{project}}' is searched."});
    translate.use('en');
    const fixture = TestBed.createComponent(HostComponent);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the title and hint with their params', () => {
    const element = render();

    expect(element.querySelector('.emptyState__title')?.textContent).toBe("Nothing matches 'abc'");
    expect(element.querySelector('.emptyState__hint')?.textContent).toBe("Only 'Apollo' is searched.");
  });

  it('leaves the hint out when none is given', () => {
    const element = render((host) => host.hint = '');

    expect(element.querySelector('.emptyState__hint')).toBeNull();
  });

  it('shows projected actions', () => {
    const element = render();

    expect(element.querySelector('.emptyState__actions .action')?.textContent).toBe('Clear search');
  });
});

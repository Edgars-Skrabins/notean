import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {ItemDetailLayoutComponent} from './item-detail-layout.component';

describe('ItemDetailLayoutComponent', () => {
  function render(autofocusTitle: boolean) {
    TestBed.configureTestingModule({
      imports: [ItemDetailLayoutComponent],
      providers: [provideTranslateService()],
    });
    const fixture = TestBed.createComponent(ItemDetailLayoutComponent);
    fixture.componentRef.setInput('favoriteType', 'Page');
    fixture.componentRef.setInput('titlePlaceholder', 'PAGE_TITLE_PLACEHOLDER');
    fixture.componentRef.setInput('editingBannerText', '');
    fixture.componentRef.setInput('confirmDeleteMessage', '');
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('showSidebar', false);
    fixture.componentRef.setInput('draftTitle', 'Agenda');
    fixture.componentRef.setInput('autofocusTitle', autofocusTitle);
    fixture.detectChanges();
    tick();
    const input = fixture.nativeElement.querySelector('.itemDetail__titleInput') as HTMLInputElement;
    return {fixture, input};
  }

  it('focuses the title and selects its text when autofocus turns on', fakeAsync(() => {
    const {input} = render(true);

    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Agenda');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(6);
  }));

  it('leaves focus alone without autofocus', fakeAsync(() => {
    const {input} = render(false);

    expect(document.activeElement).not.toBe(input);
  }));
});

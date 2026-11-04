import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {ItemDetailLayoutComponent} from './item-detail-layout.component';
import {FolderedItemDetail} from '@models/foldered-item.model';
import {EscapeService} from '@services/escape.service';
import {escapeServiceStub} from '../../testing/escapeServiceStub';

describe('ItemDetailLayoutComponent', () => {
  let fixture: ComponentFixture<ItemDetailLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemDetailLayoutComponent],
      providers: [
        provideTranslateService(),
        {provide: EscapeService, useValue: escapeServiceStub().service},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemDetailLayoutComponent);
    fixture.componentRef.setInput('item', {id: 1, title: 'Roadmap'} as FolderedItemDetail);
    fixture.componentRef.setInput('favoriteType', 'Page');
    fixture.componentRef.setInput('titlePlaceholder', 'Untitled');
    fixture.componentRef.setInput('editingBannerText', 'is editing');
    fixture.componentRef.setInput('confirmDeleteMessage', 'Delete?');
    fixture.componentRef.setInput('isTemplate', true);
    fixture.componentRef.setInput('showSidebar', false);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function panel(): HTMLElement {
    return fixture.nativeElement.querySelector('.itemDetail');
  }

  it('is a modal dialog that focuses its panel in view mode', () => {
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(panel());
  });

  it('moves focus to the title input when switching to edit mode', async () => {
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();
    await fixture.whenStable();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.itemDetail__titleInput');
    expect(document.activeElement).toBe(input);
  });

  it('is named by the heading in view mode and by the draft title in edit mode', async () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('.itemDetail__title');
    expect(panel().getAttribute('aria-labelledby')).toBe(heading.id);
    expect(panel().hasAttribute('aria-label')).toBeFalse();

    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('draftTitle', 'Roadmap draft');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(panel().getAttribute('aria-label')).toBe('Roadmap draft');
    expect(panel().hasAttribute('aria-labelledby')).toBeFalse();
  });
});

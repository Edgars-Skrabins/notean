import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {FolderedItemDetail} from '@models/foldered-item.model';
import {ItemDetailLayoutComponent} from './item-detail-layout.component';

function item(): FolderedItemDetail {
  return {
    id: 9,
    title: 'Plan',
    folderId: null,
    projectId: null,
    lockVersion: 0,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: null}},
    createdAt: '',
    updatedAt: '',
    content: '<p>Hi</p>',
    contributors: [],
    currentlyEditing: null,
    attachments: [],
  };
}

describe('ItemDetailLayoutComponent', () => {
  let fixture: ComponentFixture<ItemDetailLayoutComponent>;

  function render(mode: 'view' | 'edit' | 'create', current: FolderedItemDetail | null) {
    fixture = TestBed.createComponent(ItemDetailLayoutComponent);
    const component = fixture.componentInstance;
    component.mode = mode;
    component.item = current;
    component.favoriteType = 'Page';
    component.titlePlaceholder = PHRASES.PAGE_TITLE_PLACEHOLDER;
    component.editingBannerText = PHRASES.BEING_EDITED_BY;
    component.confirmDeleteMessage = PHRASES.DELETE;
    component.createHeading = PHRASES.NEW_PAGE;
    component.isTemplate = true;
    component.showSidebar = false;
    fixture.detectChanges();
  }

  function headings(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('h1') as NodeListOf<HTMLElement>).map((heading) => heading.textContent!.trim());
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemDetailLayoutComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
  });

  it('has one visible h1 with the item title in view mode', () => {
    render('view', item());

    expect(headings()).toEqual(['Plan']);
    expect(fixture.nativeElement.querySelector('h1').classList).toContain('itemDetail__title');
  });

  it('has one visually hidden h1 with the item title in edit mode', () => {
    render('edit', item());

    expect(headings()).toEqual(['Plan']);
    expect(fixture.nativeElement.querySelector('h1').classList).toContain('cdk-visually-hidden');
  });

  it('has one visually hidden h1 with the create heading in create mode', () => {
    render('create', null);

    expect(headings()).toEqual([PHRASES.NEW_PAGE]);
    expect(fixture.nativeElement.querySelector('h1').classList).toContain('cdk-visually-hidden');
  });

  it('names the title input with its placeholder phrase', () => {
    render('edit', item());

    const input = fixture.nativeElement.querySelector('.itemDetail__titleInput') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe(PHRASES.PAGE_TITLE_PLACEHOLDER);
  });
});
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

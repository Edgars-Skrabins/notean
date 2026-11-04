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

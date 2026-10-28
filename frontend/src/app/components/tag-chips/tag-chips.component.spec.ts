import {TagChipsComponent} from './tag-chips.component';
import {Tag} from '@models/tag.model';

function tag(id: number, name: string): Tag {
  return {id, name, color: 'blue', ticketCount: 0};
}

describe('TagChipsComponent', () => {
  it('shows up to max tags in board order and lists the rest for the +N chip', () => {
    const component = new TagChipsComponent();
    component.tags = [tag(1, 'api'), tag(2, 'bug'), tag(3, 'customer'), tag(4, 'docs')];
    component.tagIds = [4, 2, 1, 99];
    component.max = 2;

    expect(component.shownTags.map((item) => item.name)).toEqual(['api', 'bug']);
    expect(component.hiddenTags.map((item) => item.name)).toEqual(['docs']);
    expect(component.hiddenNames).toBe('docs');
  });
});

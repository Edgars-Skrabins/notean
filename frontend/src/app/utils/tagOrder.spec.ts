import {nextTagColor, sortTags} from "./tagOrder";
import {Tag} from "@models/tag.model";
import {PriorityColor} from "@models/priority.model";

function tag(id: number, name: string, color: PriorityColor = 'grey'): Tag {
  return {id, name, color, ticketCount: 0};
}

describe('sortTags', () => {
  it('sorts by name ignoring case, then by id', () => {
    expect(sortTags([tag(3, 'bug'), tag(1, 'API'), tag(2, 'Bug')]).map((item) => item.id)).toEqual([1, 2, 3]);
  });
});

describe('nextTagColor', () => {
  it('picks the least used colour, first in preset order on a tie', () => {
    expect(nextTagColor([])).toBe('grey');
    expect(nextTagColor([tag(1, 'a', 'grey'), tag(2, 'b', 'teal')])).toBe('blue');
  });
});

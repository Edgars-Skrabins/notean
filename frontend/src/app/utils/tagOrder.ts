import {PRIORITY_COLORS, PriorityColor} from "@models/priority.model";
import {Tag} from "@models/tag.model";

export function sortTags(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id - b.id);
}

export function nextTagColor(tags: Tag[]): PriorityColor {
  const counts = new Map<PriorityColor, number>();
  tags.forEach((tag) => counts.set(tag.color, (counts.get(tag.color) ?? 0) + 1));
  return PRIORITY_COLORS.reduce((best, color) => ((counts.get(color) ?? 0) < (counts.get(best) ?? 0) ? color : best));
}

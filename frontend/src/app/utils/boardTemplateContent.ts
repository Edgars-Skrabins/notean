import {BoardDetail} from "@models/board.model";
import {BoardTemplateContent} from "@models/template.model";

export const DEFAULT_BOARD_TEMPLATE_CONTENT: BoardTemplateContent = {
  columns: ['To Do', 'Doing', 'Done'],
  priorities: [
    {name: 'Very low', color: 'grey'},
    {name: 'Low', color: 'blue'},
    {name: 'Medium', color: 'yellow'},
    {name: 'High', color: 'orange'},
    {name: 'Very high', color: 'red'},
  ],
  tags: [],
};

export function boardTemplateFromBoard(board: BoardDetail): BoardTemplateContent {
  return {
    columns: [...board.columns].sort((a, b) => a.position - b.position).map((column) => column.title),
    priorities: [...board.priorities].sort((a, b) => a.position - b.position).map(({name, color}) => ({name, color})),
    tags: board.tags.map(({name, color}) => ({name, color})),
  };
}

export function parseBoardTemplateContent(content: string): BoardTemplateContent {
  const data = JSON.parse(content);
  return {columns: data.columns ?? [], priorities: data.priorities ?? [], tags: data.tags ?? []};
}

export function serializeBoardTemplateContent(content: BoardTemplateContent): string {
  return JSON.stringify({
    columns: content.columns.map((title) => title.trim()),
    priorities: content.priorities.map(({name, color}) => ({name: name.trim(), color})),
    tags: content.tags.map(({name, color}) => ({name: name.trim(), color})),
  });
}

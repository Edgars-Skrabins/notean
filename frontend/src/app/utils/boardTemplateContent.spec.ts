import {boardDetail} from "../testing/boardFixtures";
import {boardTemplateFromBoard, parseBoardTemplateContent, serializeBoardTemplateContent} from "./boardTemplateContent";

describe('boardTemplateContent', () => {
  it('copies only column titles, priorities and tags of a board, in board order', () => {
    const board = boardDetail();
    board.columns = [...board.columns].reverse();
    board.priorities = [...board.priorities].reverse();
    board.tags = [{id: 30, name: 'api', color: 'teal', ticketCount: 4}, {id: 31, name: 'Bug', color: 'red', ticketCount: 1}];

    expect(boardTemplateFromBoard(board)).toEqual({
      columns: ['To Do', 'Done'],
      priorities: [{name: 'Low', color: 'blue'}, {name: 'High', color: 'orange'}],
      tags: [{name: 'api', color: 'teal'}, {name: 'Bug', color: 'red'}],
    });
  });

  it('trims names when serialising and reads the content back', () => {
    const content = serializeBoardTemplateContent({columns: [' Ideas '], priorities: [{name: ' Hot ', color: 'red'}], tags: [{name: ' UX ', color: 'purple'}]});

    expect(parseBoardTemplateContent(content)).toEqual({columns: ['Ideas'], priorities: [{name: 'Hot', color: 'red'}], tags: [{name: 'UX', color: 'purple'}]});
  });

  it('reads templates saved without tags', () => {
    expect(parseBoardTemplateContent('{"columns":["A"],"priorities":[]}').tags).toEqual([]);
  });
});

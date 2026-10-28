import {boardDetail} from "../testing/boardFixtures";
import {boardTemplateFromBoard, parseBoardTemplateContent, serializeBoardTemplateContent} from "./boardTemplateContent";

describe('boardTemplateContent', () => {
  it('copies only column titles and priorities of a board, in position order', () => {
    const board = boardDetail();
    board.columns = [...board.columns].reverse();
    board.priorities = [...board.priorities].reverse();

    expect(boardTemplateFromBoard(board)).toEqual({
      columns: ['To Do', 'Done'],
      priorities: [{name: 'Low', color: 'blue'}, {name: 'High', color: 'orange'}],
    });
  });

  it('trims names when serialising and reads the content back', () => {
    const content = serializeBoardTemplateContent({columns: [' Ideas '], priorities: [{name: ' Hot ', color: 'red'}]});

    expect(parseBoardTemplateContent(content)).toEqual({columns: ['Ideas'], priorities: [{name: 'Hot', color: 'red'}]});
  });
});

import {teamPath} from "./teamPath";

describe('teamPath', () => {
  it('builds a path under the team', () => {
    expect(teamPath('abc')).toBe('/teams/abc');
    expect(teamPath('abc', 'boards', 5, 'columns')).toBe('/teams/abc/boards/5/columns');
  });
});

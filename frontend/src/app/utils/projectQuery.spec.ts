import {projectQuery} from "./projectQuery";

describe('projectQuery', () => {
  it('adds the project id as a query param', () => {
    expect(projectQuery(4)).toEqual({params: {project_id: 4}});
  });

  it('adds nothing under All', () => {
    expect(projectQuery(null)).toBeUndefined();
    expect(projectQuery(undefined)).toBeUndefined();
  });
});

import {ProjectFilterService} from "./project-filter.service";
import {ProjectService} from "@services/project.service";
import {TeamService} from "@services/team.service";
import {ProjectOption} from "@models/project.model";
import {testTeam} from "../testing/teamFixtures";

function project(id: number): ProjectOption {
  return {id, name: `P${id}`};
}

describe('ProjectFilterService', () => {
  let projectService: jasmine.SpyObj<ProjectService>;
  let teamService: jasmine.SpyObj<TeamService>;

  function create() {
    return new ProjectFilterService(projectService, teamService);
  }

  beforeEach(() => {
    localStorage.clear();
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['listProjectOptions']);
    projectService.listProjectOptions.and.returnValue(Promise.resolve({success: true, projects: [project(1), project(2)]}));
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeamCode', 'getCurrentTeam']);
    teamService.getCurrentTeamCode.and.returnValue('abc');
    teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team', code: 'abc'}));
  });

  afterEach(() => localStorage.clear());

  it('defaults to All', () => {
    expect(create().getSelectedProjectId()).toBeNull();
  });

  it('remembers the selection per team', () => {
    create().select(2);

    expect(localStorage.getItem('selectedProject:abc')).toBe('2');
    expect(create().getSelectedProjectId()).toBe(2);

    teamService.getCurrentTeam.and.returnValue(testTeam({id: 2, name: 'Other', code: 'xyz'}));
    expect(create().getSelectedProjectId()).toBeNull();
  });

  it('stores All explicitly', () => {
    const service = create();
    service.select(1);

    service.select(null);

    expect(localStorage.getItem('selectedProject:abc')).toBe('all');
  });

  it('loads the visible projects and keeps a valid stored selection', async () => {
    localStorage.setItem('selectedProject:abc', '2');
    const service = create();

    await service.load();

    expect(projectService.listProjectOptions).toHaveBeenCalledWith('abc');
    expect(service.getProjects().map((item) => item.id)).toEqual([1, 2]);
    expect(service.getSelectedProjectId()).toBe(2);
  });

  it('reports whether there are any visible projects', async () => {
    const service = create();
    const changes: boolean[] = [];
    service.hasProjects$.subscribe((hasProjects) => changes.push(hasProjects));

    await service.load();
    projectService.listProjectOptions.and.returnValue(Promise.resolve({success: true, projects: []}));
    await service.load();

    expect(changes).toEqual([false, true, false]);
  });

  it('falls back to All when the stored project is no longer visible', async () => {
    localStorage.setItem('selectedProject:abc', '9');
    const service = create();
    const changes: (number | null)[] = [];
    service.selectedProjectId$.subscribe((id) => changes.push(id));

    await service.load();

    expect(service.getSelectedProjectId()).toBeNull();
    expect(changes).toEqual([9, null]);
  });
});

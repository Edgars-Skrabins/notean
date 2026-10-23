import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {ManageTeamComponent} from "./manage-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {TranslateService} from "@ngx-translate/core";
import {ToastType} from "@models/toast.model";
import {TeamRole} from "@models/team.model";
import {PHRASES} from "@config/phrases";
import {testTeam} from "../../testing/teamFixtures";

function teamServiceSpy() {
  const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeam', 'getCurrentRole', 'fetchTeamMembers', 'isFeatureEnabled', 'updateFeatures']);
  teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team A', code: 'aaa'}));
  teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
  teamService.isFeatureEnabled.and.callFake((feature) => feature !== 'diagrams');
  return teamService;
}

describe('ManageTeamComponent.isOwner', () => {
  let component: ManageTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = teamServiceSpy();
    component = new ManageTeamComponent({} as NavigationService, teamService, {} as TranslateService, {} as ToastService);
  });

  it('returns false when the current role is user', () => {
    teamService.getCurrentRole.and.returnValue('user');

    expect(component.isOwner).toBeFalse();
  });

  it('returns false when the current role is admin', () => {
    teamService.getCurrentRole.and.returnValue('admin');

    expect(component.isOwner).toBeFalse();
  });

  it('returns true when the current role is owner', () => {
    teamService.getCurrentRole.and.returnValue('owner');

    expect(component.isOwner).toBeTrue();
  });
});

describe('ManageTeamComponent features', () => {
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;

  function render(role: TeamRole) {
    teamService.getCurrentRole.and.returnValue(role);
    const fixture = TestBed.createComponent(ManageTeamComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    teamService = teamServiceSpy();
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    await TestBed.configureTestingModule({
      imports: [ManageTeamComponent, TranslateModule.forRoot()],
      providers: [
        {provide: TeamService, useValue: teamService},
        {provide: ToastService, useValue: toastService},
        {provide: NavigationService, useValue: {}},
      ],
    })
      .overrideComponent(ManageTeamComponent, {set: {imports: [NgFor, NgIf, TranslateModule], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
  });

  it('shows the Features toggles with the current flags to the owner only', () => {
    const owner = render('owner');
    const checkboxes = Array.from(owner.nativeElement.querySelectorAll('app-checkbox')) as HTMLElement[];
    expect(checkboxes.length).toBe(3);
    expect(owner.componentInstance.features).toEqual({pages: true, diagrams: false, boards: true});

    expect(render('admin').nativeElement.querySelectorAll('app-checkbox').length).toBe(0);
    expect(render('user').nativeElement.querySelectorAll('app-checkbox').length).toBe(0);
  });

  it('saves a toggle with updateFeatures and shows a success toast', async () => {
    teamService.updateFeatures.and.returnValue(Promise.resolve({success: true, team: testTeam({boardsEnabled: false})}));
    const component = render('owner').componentInstance;

    await component.handleFeatureChange('boards', false);

    expect(teamService.updateFeatures).toHaveBeenCalledOnceWith('aaa', {boards: false});
    expect(component.features.boards).toBeFalse();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.FEATURES_UPDATED});
  });

  it('reverts the toggle and shows an error toast when saving fails', async () => {
    teamService.updateFeatures.and.returnValue(Promise.resolve({success: false, code: 'FORBIDDEN'}));
    const component = render('owner').componentInstance;

    await component.handleFeatureChange('pages', false);

    expect(component.features.pages).toBeTrue();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.ERROR, message: 'ERRORS.COMMON.FORBIDDEN'});
  });
});

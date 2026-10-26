import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NgFor, NgIf} from '@angular/common';
import {provideTranslateService, TranslatePipe, TranslateService} from '@ngx-translate/core';
import {SwitchTeamComponent} from "./switch-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {EscapeService} from "@services/escape.service";
import {TeamRole, TeamWithRole} from "@models/team.model";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../../app/app-routes.enum";
import {testTeam} from "../../testing/teamFixtures";
import {escapeServiceStub} from "../../testing/escapeServiceStub";

describe('SwitchTeamComponent.isActive', () => {
  let component: SwitchTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentTeam']);
    component = new SwitchTeamComponent({} as NavigationService, teamService, escapeServiceStub().service, {} as TranslateService);
  });

  it('returns false when the team code does not match the current team', () => {
    teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team A', code: 'aaa'}));

    expect(component.isActive({...testTeam(testTeam({id: 2, name: 'Team B', code: 'bbb'})), role: 'user', nickname: 'Alice'})).toBeFalse();
  });

  it('returns true when the team code matches the current team', () => {
    teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team A', code: 'aaa'}));

    expect(component.isActive({...testTeam(testTeam({id: 1, name: 'Team A', code: 'aaa'})), role: 'owner', nickname: 'Alice'})).toBeTrue();
  });

  it('returns false when there is no current team', () => {
    teamService.getCurrentTeam.and.returnValue(null);

    expect(component.isActive({...testTeam(testTeam({id: 1, name: 'Team A', code: 'aaa'})), role: 'user', nickname: 'Alice'})).toBeFalse();
  });
});

function teamWithRole(code: string, role: TeamRole): TeamWithRole {
  return {...testTeam({code, name: `Team ${code}`}), role, nickname: 'Alice'};
}

describe('SwitchTeamComponent leave team', () => {
  let teamService: jasmine.SpyObj<TeamService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let translateService: jasmine.SpyObj<TranslateService>;
  let component: SwitchTeamComponent;

  beforeEach(() => {
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeam', 'leaveTeam', 'fetchMyTeams']);
    teamService.getCurrentTeam.and.returnValue(testTeam({code: 'aaa'}));
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string | string[], params?: object) => `${key} ${JSON.stringify(params)}`);
    component = new SwitchTeamComponent(navigationService, teamService, escapeServiceStub().service, translateService);
    component.teams = [teamWithRole('aaa', 'user'), teamWithRole('bbb', 'admin'), teamWithRole('ccc', 'owner')];
  });

  it('asks for confirmation with the team name', () => {
    component.handleLeaveTeam(component.teams[1]);

    expect(component.pendingLeaveMessage).toBe(`${PHRASES.CONFIRM_LEAVE_TEAM} {"team":"Team bbb"}`);
    expect(teamService.leaveTeam).not.toHaveBeenCalled();
  });

  it('does not offer leaving a team the user owns', () => {
    component.handleLeaveTeam(component.teams[2]);

    expect(component.pendingLeave).toBeNull();
  });

  it('removes the row after leaving another team and stays on the page', async () => {
    teamService.leaveTeam.and.returnValue(Promise.resolve({success: true}));
    component.handleLeaveTeam(component.teams[1]);

    await component.handleConfirmLeaveTeam();

    expect(teamService.leaveTeam).toHaveBeenCalledOnceWith('bbb');
    expect(component.teams.map((team) => team.code)).toEqual(['aaa', 'ccc']);
    expect(navigationService.navigate).not.toHaveBeenCalled();
  });

  it('goes to team selection after leaving the active team', async () => {
    teamService.leaveTeam.and.callFake(() => {
      teamService.getCurrentTeam.and.returnValue(null);
      return Promise.resolve({success: true});
    });
    component.handleLeaveTeam(component.teams[0]);

    await component.handleConfirmLeaveTeam();

    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.TEAM_SELECTION);
  });

  it('shows the translated error and keeps the row when leaving fails', async () => {
    teamService.leaveTeam.and.returnValue(Promise.resolve({success: false, code: 'OWNER_CANNOT_LEAVE'}));
    component.handleLeaveTeam(component.teams[1]);

    await component.handleConfirmLeaveTeam();

    expect(component.alertMessage).toBe('ERRORS.TEAMS.OWNER_CANNOT_LEAVE');
    expect(component.teams.length).toBe(3);
  });

  it('disables Leave team with a tooltip on the owned team only', async () => {
    teamService.fetchMyTeams.and.returnValue(Promise.resolve(component.teams));
    await TestBed.configureTestingModule({
      imports: [SwitchTeamComponent],
      providers: [
        provideTranslateService(),
        {provide: TeamService, useValue: teamService},
        {provide: NavigationService, useValue: navigationService},
        {provide: EscapeService, useValue: escapeServiceStub().service},
      ],
    })
      .overrideComponent(SwitchTeamComponent, {set: {imports: [NgFor, NgIf, TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
    const fixture = TestBed.createComponent(SwitchTeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const leaves = Array.from(fixture.nativeElement.querySelectorAll('.switchTeam__leave')) as (HTMLElement & { appTooltip: string })[];
    const buttons = leaves.map((leave) => leave.querySelector('app-button') as HTMLElement & { disabled: boolean });

    expect(buttons.map((button) => button.disabled)).toEqual([false, false, true]);
    expect(leaves.map((leave) => leave.appTooltip)).toEqual(['', '', PHRASES.TRANSFER_BEFORE_LEAVING]);
  });
});

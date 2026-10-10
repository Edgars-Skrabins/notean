import {CreateTeamComponent} from "./create-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {NicknameError} from "@models/team.model";
import {PHRASES} from "@config/phrases";
import {fakeAsync, tick} from "@angular/core/testing";

describe('CreateTeamComponent.doesFormHaveValidData', () => {
  let component: CreateTeamComponent;

  beforeEach(() => {
    component = new CreateTeamComponent({} as NavigationService, {} as TeamService, {} as ToastService);
  });

  it('returns false when the team name is empty', () => {
    component.teamName = '';
    component.teamPassword = 'password';

    expect(component.doesFormHaveValidData()).toBeFalse();
  });

  it('returns false when the team password is empty', () => {
    component.teamName = 'My Team';
    component.teamPassword = '';

    expect(component.doesFormHaveValidData()).toBeFalse();
  });

  it('returns true when both fields are filled in', () => {
    component.teamName = 'My Team';
    component.teamPassword = 'password';

    expect(component.doesFormHaveValidData()).toBeTrue();
  });
});

describe('CreateTeamComponent.handleCreateTeam', () => {
  let component: CreateTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['createTeam']);
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    component = new CreateTeamComponent(jasmine.createSpyObj('NavigationService', ['navigate']), teamService, toastService);
    component.teamName = 'My Team';
    component.teamPassword = 'password';
  });

  it('shows a toast and sends nothing when the nickname is invalid', () => {
    component.nickname = 'Al';

    component.handleCreateTeam();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.NICKNAME_TOO_SHORT});
    expect(teamService.createTeam).not.toHaveBeenCalled();
  });

  it('sends the trimmed nickname', () => {
    teamService.createTeam.and.returnValue(new Promise(() => {}));
    component.nickname = '  Alice  ';

    component.handleCreateTeam();

    expect(teamService.createTeam).toHaveBeenCalledWith(jasmine.objectContaining({nickname: 'Alice'}));
  });

  it('shows a toast for a nickname failure from the request', fakeAsync(() => {
    teamService.createTeam.and.returnValue(Promise.resolve({success: false, statusMessage: 'taken', nicknameError: NicknameError.TAKEN}));
    component.nickname = 'Alice';

    component.handleCreateTeam();
    tick();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.NICKNAME_TAKEN});
    expect(component.alertMessage).toBe('');
  }));

  it('keeps other failures inline', fakeAsync(() => {
    teamService.createTeam.and.returnValue(Promise.resolve({success: false, statusMessage: 'Wrong password', nicknameError: null}));
    component.nickname = 'Alice';

    component.handleCreateTeam();
    tick();

    expect(component.alertMessage).toBe('Wrong password');
    expect(toastService.show).not.toHaveBeenCalled();
  }));
});

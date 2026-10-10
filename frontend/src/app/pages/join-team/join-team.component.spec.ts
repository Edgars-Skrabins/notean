import {JoinTeamComponent} from "./join-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {NicknameError} from "@models/team.model";
import {PHRASES} from "@config/phrases";
import {fakeAsync, tick} from "@angular/core/testing";

describe('JoinTeamComponent.doesFormHaveValidData', () => {
  let component: JoinTeamComponent;

  beforeEach(() => {
    component = new JoinTeamComponent({} as NavigationService, {} as TeamService, {} as ToastService);
  });

  it('returns false when the team code is not 32 characters', () => {
    component.teamCode = 'too-short';
    component.teamPassword = 'password';

    expect(component.doesFormHaveValidData()).toBeFalse();
  });

  it('returns false when the team password is empty', () => {
    component.teamCode = 'a'.repeat(32);
    component.teamPassword = '';

    expect(component.doesFormHaveValidData()).toBeFalse();
  });

  it('returns true when the code is 32 characters and password is filled in', () => {
    component.teamCode = 'a'.repeat(32);
    component.teamPassword = 'password';

    expect(component.doesFormHaveValidData()).toBeTrue();
  });
});

describe('JoinTeamComponent.handleJoinTeam', () => {
  let component: JoinTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['joinTeam']);
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    component = new JoinTeamComponent(jasmine.createSpyObj('NavigationService', ['navigate']), teamService, toastService);
    component.teamCode = 'a'.repeat(32);
    component.teamPassword = 'password';
  });

  it('shows a toast and sends nothing when the nickname is invalid', () => {
    component.nickname = 'Al';

    component.handleJoinTeam();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.NICKNAME_TOO_SHORT});
    expect(teamService.joinTeam).not.toHaveBeenCalled();
  });

  it('sends the trimmed nickname', () => {
    teamService.joinTeam.and.returnValue(new Promise(() => {}));
    component.nickname = '  Alice  ';

    component.handleJoinTeam();

    expect(teamService.joinTeam).toHaveBeenCalledWith(jasmine.objectContaining({nickname: 'Alice'}));
  });

  it('shows a toast for a nickname failure from the request', fakeAsync(() => {
    teamService.joinTeam.and.returnValue(Promise.resolve({success: false, statusMessage: 'taken', nicknameError: NicknameError.TAKEN}));
    component.nickname = 'Alice';

    component.handleJoinTeam();
    tick();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.NICKNAME_TAKEN});
    expect(component.alertMessage).toBe('');
  }));

  it('keeps other failures inline', fakeAsync(() => {
    teamService.joinTeam.and.returnValue(Promise.resolve({success: false, statusMessage: 'Wrong password', nicknameError: null}));
    component.nickname = 'Alice';

    component.handleJoinTeam();
    tick();

    expect(component.alertMessage).toBe('Wrong password');
    expect(toastService.show).not.toHaveBeenCalled();
  }));
});

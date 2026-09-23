import {JoinTeamComponent} from "./join-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";

describe('JoinTeamComponent.doesFormHaveValidData', () => {
  let component: JoinTeamComponent;

  beforeEach(() => {
    component = new JoinTeamComponent({} as NavigationService, {} as TeamService);
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

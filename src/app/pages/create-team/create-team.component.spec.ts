import {CreateTeamComponent} from "./create-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";

describe('CreateTeamComponent.doesFormHaveValidData', () => {
  let component: CreateTeamComponent;

  beforeEach(() => {
    component = new CreateTeamComponent({} as NavigationService, {} as TeamService);
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

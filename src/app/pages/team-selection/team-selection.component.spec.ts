import {TeamSelectionComponent} from "./team-selection.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";

describe('TeamSelectionComponent.showSwitchTeam', () => {
  let component: TeamSelectionComponent;

  beforeEach(() => {
    component = new TeamSelectionComponent({} as NavigationService, {} as TeamService);
  });

  it('returns false when the user belongs to zero teams', () => {
    component.teamCount = 0;

    expect(component.showSwitchTeam).toBeFalse();
  });

  it('returns false when the user belongs to exactly one team', () => {
    component.teamCount = 1;

    expect(component.showSwitchTeam).toBeFalse();
  });

  it('returns true when the user belongs to more than one team', () => {
    component.teamCount = 2;

    expect(component.showSwitchTeam).toBeTrue();
  });
});

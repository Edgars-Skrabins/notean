import {teamRoleLabel} from "./teamRoleLabel";
import {PHRASES} from "@config/phrases";

describe('teamRoleLabel', () => {
  it('returns the owner phrase for owner', () => {
    expect(teamRoleLabel('owner')).toBe(PHRASES.ROLE_OWNER);
  });

  it('returns the admin phrase for admin', () => {
    expect(teamRoleLabel('admin')).toBe(PHRASES.ROLE_ADMIN);
  });

  it('returns the user phrase for user', () => {
    expect(teamRoleLabel('user')).toBe(PHRASES.ROLE_USER);
  });
});

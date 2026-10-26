import {isPasswordLongEnough, PASSWORD_MIN_LENGTH} from "./passwordValidation";

describe('isPasswordLongEnough', () => {
  it('requires at least 8 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(isPasswordLongEnough('')).toBeFalse();
    expect(isPasswordLongEnough('a'.repeat(7))).toBeFalse();
    expect(isPasswordLongEnough('a'.repeat(8))).toBeTrue();
  });

  it('counts spaces and symbols as characters', () => {
    expect(isPasswordLongEnough('  !@# $%')).toBeTrue();
  });
});

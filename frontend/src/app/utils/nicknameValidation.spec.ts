import {isNicknameErrorCode, nicknameErrorPhrase, validateNickname} from "./nicknameValidation";
import {NicknameError} from "@models/team.model";
import {PHRASES} from "@config/phrases";

describe('validateNickname', () => {
  it('accepts letters only between 3 and 30 characters', () => {
    expect(validateNickname('Ali')).toBeNull();
    expect(validateNickname('a'.repeat(30))).toBeNull();
    expect(validateNickname('AliceSmith')).toBeNull();
  });

  it('trims surrounding whitespace before checking', () => {
    expect(validateNickname('  Alice  ')).toBeNull();
    expect(validateNickname('  Al  ')).toBe(NicknameError.TOO_SHORT);
  });

  it('rejects nicknames shorter than 3 characters', () => {
    expect(validateNickname('')).toBe(NicknameError.TOO_SHORT);
    expect(validateNickname('Al')).toBe(NicknameError.TOO_SHORT);
  });

  it('rejects nicknames longer than 30 characters', () => {
    expect(validateNickname('a'.repeat(31))).toBe(NicknameError.TOO_LONG);
  });

  it('rejects digits, spaces and symbols', () => {
    ['Alice1', 'Al ice', 'Alice!', 'Ali_ce', 'Alīce'].forEach((value) => {
      expect(validateNickname(value)).withContext(value).toBe(NicknameError.INVALID_CHARACTERS);
    });
  });

  it('checks length before characters', () => {
    expect(validateNickname('1!')).toBe(NicknameError.TOO_SHORT);
  });
});

describe('nicknameErrorPhrase', () => {
  it('maps every error to its phrase', () => {
    expect(nicknameErrorPhrase(NicknameError.TOO_SHORT)).toBe(PHRASES.NICKNAME_TOO_SHORT);
    expect(nicknameErrorPhrase(NicknameError.TOO_LONG)).toBe(PHRASES.NICKNAME_TOO_LONG);
    expect(nicknameErrorPhrase(NicknameError.INVALID_CHARACTERS)).toBe(PHRASES.NICKNAME_INVALID_CHARACTERS);
  });
});

describe('isNicknameErrorCode', () => {
  it('is true for the nickname codes only', () => {
    expect(isNicknameErrorCode('NICKNAME_TAKEN')).toBeTrue();
    expect(isNicknameErrorCode('NICKNAME_INVALID')).toBeTrue();
    expect(isNicknameErrorCode('WRONG_TEAM_PASSWORD')).toBeFalse();
  });
});

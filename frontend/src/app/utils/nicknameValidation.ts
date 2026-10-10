import {PHRASES} from "@config/phrases";
import {NicknameError} from "@models/team.model";

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 30;
export const NICKNAME_PATTERN = /^[a-zA-Z]+$/;

export function validateNickname(value: string): NicknameError | null {
  const nickname = value.trim();

  if (nickname.length < NICKNAME_MIN_LENGTH) {
    return NicknameError.TOO_SHORT;
  }

  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return NicknameError.TOO_LONG;
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    return NicknameError.INVALID_CHARACTERS;
  }

  return null;
}

export function nicknameErrorPhrase(error: NicknameError): string {
  switch (error) {
    case NicknameError.TOO_SHORT:
      return PHRASES.NICKNAME_TOO_SHORT;
    case NicknameError.TOO_LONG:
      return PHRASES.NICKNAME_TOO_LONG;
    case NicknameError.INVALID_CHARACTERS:
      return PHRASES.NICKNAME_INVALID_CHARACTERS;
    case NicknameError.TAKEN:
      return PHRASES.NICKNAME_TAKEN;
    case NicknameError.NETWORK:
      return PHRASES.NETWORK_ERROR;
    case NicknameError.UNKNOWN:
      return PHRASES.NICKNAME_UPDATE_FAILED;
  }
}

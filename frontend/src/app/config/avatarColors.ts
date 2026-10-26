import {PHRASES} from "@config/phrases";

export type AvatarColor =
  | 'red'
  | 'orange'
  | 'green'
  | 'lime'
  | 'yellow'
  | 'blue'
  | 'cyan'
  | 'pink'
  | 'purple'
  | 'brown'
  | 'beige'
  | 'light_grey'
  | 'dark_grey';

export interface AvatarColorOption {
  key: AvatarColor;
  hex: string;
  textColor: string;
  phrase: string;
}

const LIGHT_TEXT = '#FFFFFF';
const DARK_TEXT = '#212121';

export const AVATAR_COLORS: AvatarColorOption[] = [
  {key: 'red', hex: '#E53935', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_RED},
  {key: 'orange', hex: '#FB8C00', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_ORANGE},
  {key: 'green', hex: '#43A047', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_GREEN},
  {key: 'lime', hex: '#C0CA33', textColor: DARK_TEXT, phrase: PHRASES.COLOR_LIME},
  {key: 'yellow', hex: '#FDD835', textColor: DARK_TEXT, phrase: PHRASES.COLOR_YELLOW},
  {key: 'blue', hex: '#1E88E5', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_BLUE},
  {key: 'cyan', hex: '#00ACC1', textColor: DARK_TEXT, phrase: PHRASES.COLOR_CYAN},
  {key: 'pink', hex: '#D81B60', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_PINK},
  {key: 'purple', hex: '#8E24AA', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_PURPLE},
  {key: 'brown', hex: '#6D4C41', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_BROWN},
  {key: 'beige', hex: '#D7C4A3', textColor: DARK_TEXT, phrase: PHRASES.COLOR_BEIGE},
  {key: 'light_grey', hex: '#BDBDBD', textColor: DARK_TEXT, phrase: PHRASES.COLOR_LIGHT_GREY},
  {key: 'dark_grey', hex: '#424242', textColor: LIGHT_TEXT, phrase: PHRASES.COLOR_DARK_GREY},
];

export const AVATAR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const AVATAR_IMAGE_MAX_BYTES = 256 * 1024;

export const AVATAR_IMAGE_SIZE = 128;

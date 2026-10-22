export interface LanguageOption {
  code: string;
  flag: string;
  label: string;
}

export const languageOptions: LanguageOption[] = [
  {code: 'en', flag: '🇬🇧', label: 'English'},
  {code: 'da', flag: '🇩🇰', label: 'Dansk'},
  {code: 'de', flag: '🇩🇪', label: 'Deutsch'},
  {code: 'et', flag: '🇪🇪', label: 'Eesti'},
  {code: 'es', flag: '🇪🇸', label: 'Español'},
  {code: 'fr', flag: '🇫🇷', label: 'Français'},
  {code: 'lv', flag: '🇱🇻', label: 'Latviešu'},
  {code: 'lt', flag: '🇱🇹', label: 'Lietuvių'},
  {code: 'fi', flag: '🇫🇮', label: 'Suomi'},
  {code: 'sv', flag: '🇸🇪', label: 'Svenska'},
  {code: 'ru', flag: '🇷🇺', label: 'Русский'},
];

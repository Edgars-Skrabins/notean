export function getBrowserLanguage() {
  let browserLanguage = navigator.language;
  browserLanguage = browserLanguage.split('-')[0];
  return browserLanguage
}

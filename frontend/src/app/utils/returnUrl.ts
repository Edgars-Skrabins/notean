export const RETURN_URL_PARAM = 'returnUrl';

export function isSafeReturnUrl(url: string | null): url is string {
  return !!url && url.startsWith('/') && !url.startsWith('//');
}

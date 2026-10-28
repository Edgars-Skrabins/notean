import {isSafeReturnUrl} from "./returnUrl";

describe('isSafeReturnUrl', () => {
  it('accepts an in-app path', () => {
    expect(isSafeReturnUrl('/dashboard/pages/1?team=X')).toBeTrue();
  });

  it('rejects a missing value', () => {
    expect(isSafeReturnUrl(null)).toBeFalse();
    expect(isSafeReturnUrl('')).toBeFalse();
  });

  it('rejects links that leave the app', () => {
    expect(isSafeReturnUrl('//evil.com')).toBeFalse();
    expect(isSafeReturnUrl('https://evil.com')).toBeFalse();
    expect(isSafeReturnUrl('dashboard')).toBeFalse();
  });
});

import {uniqueId} from "./uniqueId";

describe('uniqueId', () => {
  it('returns a different id with the same prefix on every call', () => {
    const first = uniqueId('confirmDialog');
    const second = uniqueId('confirmDialog');

    expect(first).not.toBe(second);
    expect(first.startsWith('confirmDialog-')).toBeTrue();
    expect(second.startsWith('confirmDialog-')).toBeTrue();
  });
});

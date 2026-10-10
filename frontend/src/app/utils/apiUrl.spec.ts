import {apiUrl} from "./apiUrl";
import {baseUrl} from "@config/axiosConfig";

describe('apiUrl', () => {
  it('prefixes the path with the API base URL', () => {
    expect(apiUrl('/rails/active_storage/blobs/redirect/abc/avatar.png')).toBe(`${baseUrl}/rails/active_storage/blobs/redirect/abc/avatar.png`);
  });
});

import {axiosInstance} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.setItem('authToken', 'jwt');
    localStorage.setItem('authUser', JSON.stringify({id: 1, email: 'alice@example.com'}));
  });

  afterEach(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    delete axiosInstance.defaults.headers.common['Authorization'];
  });

  it('logout ends the session on the server with the current token', () => {
    const remove = spyOn(axiosInstance, 'delete').and.resolveTo({status: 204} as any);
    const service = new AuthService();

    service.logout();

    expect(remove).toHaveBeenCalledOnceWith('/auth/session', {headers: {Authorization: 'Bearer jwt'}});
  });

  it('logout clears local state even when the server request fails', async () => {
    spyOn(axiosInstance, 'delete').and.rejectWith(new Error('network'));
    const service = new AuthService();

    service.logout();
    await Promise.resolve();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
    expect(axiosInstance.defaults.headers.common['Authorization']).toBeUndefined();
  });

  it('logout without a token sends no request', () => {
    localStorage.removeItem('authToken');
    const remove = spyOn(axiosInstance, 'delete');
    const service = new AuthService();

    service.logout();

    expect(remove).not.toHaveBeenCalled();
  });
});

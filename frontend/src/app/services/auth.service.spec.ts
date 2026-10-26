import {AxiosError, AxiosResponse} from "axios";
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

  function errorWith(data: object): AxiosError {
    const error = new AxiosError('failed');
    error.response = {status: 422, data} as AxiosResponse;
    return error;
  }

  it('changePassword sends both passwords and succeeds on 204', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: '', status: 204}));
    const service = new AuthService();

    const response = await service.changePassword('oldpassword', 'newpassword');

    expect(patch).toHaveBeenCalledWith('/users/me/password', {password: {current_password: 'oldpassword', new_password: 'newpassword'}});
    expect(response).toEqual({success: true});
  });

  it('changePassword maps a wrong current password to its error code', async () => {
    const error = new AxiosError('failed');
    error.response = {data: {code: 'CURRENT_PASSWORD_INVALID'}, status: 422, statusText: '', headers: {}, config: {} as never};
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(error));
    const service = new AuthService();

    const response = await service.changePassword('wrongpassword', 'newpassword');

    expect(response).toEqual({success: false, code: 'CURRENT_PASSWORD_INVALID'});
  });

  it('changePassword maps a too short password to its error code', async () => {
    const error = new AxiosError('failed');
    error.response = {data: {code: 'PASSWORD_TOO_SHORT'}, status: 422, statusText: '', headers: {}, config: {} as never};
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(error));
    const service = new AuthService();

    const response = await service.changePassword('oldpassword', 'short');

    expect(response).toEqual({success: false, code: 'PASSWORD_TOO_SHORT'});
  });

  describe('deleteAccount', () => {
    it('sends DELETE /users/me and succeeds on 204', async () => {
      const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({status: 204, data: ''}));

      const response = await new AuthService().deleteAccount();

      expect(remove).toHaveBeenCalledWith('/users/me');
      expect(response).toEqual({success: true});
    });

    it('returns OWNS_TEAMS with the owned teams', async () => {
      spyOn(axiosInstance, 'delete').and.returnValue(Promise.reject(errorWith({
        code: 'OWNS_TEAMS',
        teams: [{code: 'ABC123', name: 'Alpha'}, {code: 'XYZ789', name: 'Zeta'}],
      })));

      const response = await new AuthService().deleteAccount();

      expect(response).toEqual({
        success: false,
        code: 'OWNS_TEAMS',
        teams: [{code: 'ABC123', name: 'Alpha'}, {code: 'XYZ789', name: 'Zeta'}],
      });
    });

    it('returns other error codes without teams', async () => {
      spyOn(axiosInstance, 'delete').and.returnValue(Promise.reject(errorWith({code: 'UNAUTHORIZED'})));

      const response = await new AuthService().deleteAccount();

      expect(response).toEqual({success: false, code: 'UNAUTHORIZED'});
    });
  });
});

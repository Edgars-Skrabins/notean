import {AxiosError} from "axios";
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
});

import {AxiosError} from "axios";
import {AuthService} from "./auth.service";
import {axiosInstance} from "@config/axiosConfig";

describe('AuthService', () => {
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

import {AxiosError, AxiosResponse} from "axios";
import {AuthService} from "./auth.service";
import {axiosInstance} from "@config/axiosConfig";

describe('AuthService', () => {
  function errorWith(data: object): AxiosError {
    const error = new AxiosError('failed');
    error.response = {status: 422, data} as AxiosResponse;
    return error;
  }

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

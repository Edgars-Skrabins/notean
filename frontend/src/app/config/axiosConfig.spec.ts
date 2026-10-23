import {AxiosAdapter, AxiosError, AxiosHeaders} from "axios";
import {axiosInstance, setFeatureDisabledHandler, setUnauthorizedHandler} from "./axiosConfig";

describe('axiosInstance error handlers', () => {
  let originalAdapter: typeof axiosInstance.defaults.adapter;
  let onUnauthorized: jasmine.Spy;
  let onFeatureDisabled: jasmine.Spy;

  function respondWith(status: number, code: string): AxiosAdapter {
    return (config) => Promise.reject(new AxiosError('failed', undefined, config, undefined, {
      status, statusText: '', data: {code}, headers: {}, config: {headers: new AxiosHeaders()}
    }));
  }

  beforeEach(() => {
    originalAdapter = axiosInstance.defaults.adapter;
    onUnauthorized = jasmine.createSpy('onUnauthorized');
    onFeatureDisabled = jasmine.createSpy('onFeatureDisabled');
    setUnauthorizedHandler(onUnauthorized);
    setFeatureDisabledHandler(onFeatureDisabled);
  });

  afterEach(() => {
    axiosInstance.defaults.adapter = originalAdapter;
    setUnauthorizedHandler(() => undefined);
    setFeatureDisabledHandler(() => undefined);
  });

  it('calls the feature disabled handler on a FEATURE_DISABLED 403', async () => {
    axiosInstance.defaults.adapter = respondWith(403, 'FEATURE_DISABLED');

    await expectAsync(axiosInstance.get('/teams/abc/boards')).toBeRejected();

    expect(onFeatureDisabled).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('ignores other 403 codes', async () => {
    axiosInstance.defaults.adapter = respondWith(403, 'FORBIDDEN');

    await expectAsync(axiosInstance.get('/teams/abc')).toBeRejected();

    expect(onFeatureDisabled).not.toHaveBeenCalled();
  });

  it('still calls the unauthorized handler on a 401', async () => {
    axiosInstance.defaults.adapter = respondWith(401, 'UNAUTHORIZED');

    await expectAsync(axiosInstance.get('/users/me')).toBeRejected();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onFeatureDisabled).not.toHaveBeenCalled();
  });
});

import {AxiosError, AxiosResponse} from "axios";
import {apiRequest} from "./apiRequest";
import {Result} from "@models/result.model";

type TestResult = Result<{ value: number }>;

describe('apiRequest', () => {
  it('maps the response data on success', async () => {
    const request = Promise.resolve({data: {value: 3}} as AxiosResponse);

    const result = await apiRequest<TestResult>(request, (data) => ({success: true, value: data.value}));

    expect(result).toEqual({success: true, value: 3});
  });

  it('returns a failed result with the error code on failure', async () => {
    const request = Promise.reject(new AxiosError('Network Error'));

    const result = await apiRequest<TestResult>(request, (data) => ({success: true, value: data.value}));

    expect(result).toEqual({success: false, code: 'NETWORK_ERROR'});
  });
});

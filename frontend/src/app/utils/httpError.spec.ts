import axios from "axios";
import {toErrorCode, toErrorResult} from "./httpError";
import {Result} from "@models/result.model";
import {PagesErrorCode} from "@config/errorCodes";

function responseError(status: number, data: unknown) {
  const error = new axios.AxiosError('Request failed');
  error.response = {data, status, statusText: '', headers: {}, config: {} as never};
  return error;
}

describe('toErrorCode', () => {
  it('returns the code sent by the server', () => {
    expect(toErrorCode(responseError(404, {code: 'PAGE_NOT_FOUND'}))).toBe('PAGE_NOT_FOUND');
  });

  it('returns UNKNOWN_ERROR for a code the frontend does not know', () => {
    expect(toErrorCode(responseError(422, {code: 'SOMETHING_NEW'}))).toBe('UNKNOWN_ERROR');
  });

  it('returns UNKNOWN_ERROR when the response has no code', () => {
    expect(toErrorCode(responseError(500, {}))).toBe('UNKNOWN_ERROR');
  });

  it('returns NETWORK_ERROR when there is no response', () => {
    expect(toErrorCode(new axios.AxiosError('Network Error'))).toBe('NETWORK_ERROR');
  });

  it('returns UNKNOWN_ERROR for a non-axios error', () => {
    expect(toErrorCode(new Error('boom'))).toBe('UNKNOWN_ERROR');
  });
});

describe('toErrorResult', () => {
  it('wraps the code in a failed result', () => {
    const result = toErrorResult<Result<{ id: number }, PagesErrorCode>>(responseError(404, {code: 'PAGE_NOT_FOUND'}));

    expect(result).toEqual({success: false, code: 'PAGE_NOT_FOUND'});
  });
});

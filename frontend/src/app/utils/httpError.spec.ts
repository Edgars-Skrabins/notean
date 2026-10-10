import axios from "axios";
import {toErrorResult} from "./httpError";

interface TestResult {
  success: false;
  statusMessage: string;
}

describe('toErrorResult', () => {
  it('uses the statusMessage from the response data when present', () => {
    const error = new axios.AxiosError('Request failed');
    error.response = {
      data: {statusMessage: 'Board not found'},
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: {} as never,
    };

    const result = toErrorResult<TestResult>(error, 'Failed to load board');

    expect(result).toEqual({success: false, statusMessage: 'Board not found'});
  });

  it('falls back to the fallback message when the response has no statusMessage', () => {
    const error = new axios.AxiosError('Request failed');
    error.response = {
      data: {},
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
    };

    const result = toErrorResult<TestResult>(error, 'Failed to load board');

    expect(result).toEqual({success: false, statusMessage: 'Failed to load board'});
  });

  it('falls back to the fallback message for a non-axios error', () => {
    const result = toErrorResult<TestResult>(new Error('boom'), 'Failed to load board');

    expect(result).toEqual({success: false, statusMessage: 'Failed to load board'});
  });
});

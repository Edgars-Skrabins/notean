import axios from "axios";
import {environment} from "../../environments/environment";

export const baseUrl = environment.apiUrl;

export const axiosInstance = axios.create({
  baseURL: baseUrl,
});

export function setAuthToken(token: string | null) {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

let featureDisabledHandler: (() => void) | null = null;

export function setFeatureDisabledHandler(handler: () => void) {
  featureDisabledHandler = handler;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      unauthorizedHandler?.();
    }
    if (error.response?.status === 403 && error.response.data?.code === 'FEATURE_DISABLED') {
      featureDisabledHandler?.();
    }
    return Promise.reject(error);
  },
);

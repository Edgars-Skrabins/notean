import axios from "axios";

const baseUrl = 'http://127.0.0.1:3000';

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

import axios from "axios";

const baseUrl = 'http://127.0.0.1:3000';

export const axiosInstance = axios.create({
  baseURL: baseUrl,
});

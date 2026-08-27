import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

export const apiClient2 = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL_ANA,
  timeout: 30 * 60 * 1000, // 30 minutes
});

apiClient2.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    // const user = useAuthStore.getState().user;
    // // if (user?.schema_name) {
    // //   config.headers.set("X-Schema-Name", user.schema_name);
    // // }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient2.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "[Local API Error]",
      error.response?.status,
      error.response?.data,
    );
    return Promise.reject(error);
  },
);

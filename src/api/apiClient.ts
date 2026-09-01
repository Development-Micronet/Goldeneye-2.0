import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "../store/useAuthStore";
import { useMapStore } from "../features/data/store/useMapStore";
import { useLayersStore } from "../store/useLayersStore";
import { logger } from "../utils/logger";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/`,
  timeout: 150000,
});

/**
 * Request Interceptor
 *
 * Only adds required headers.
 * URL is NOT modified.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken, user } = useAuthStore.getState();

    // Required headers
    config.headers.set("Content-Type", "application/json");

    if (API_KEY) {
      config.headers.set("x-api-key", API_KEY);
    }

    if (user?.schema_name) {
      config.headers.set("X-Schema-Name", user.schema_name);
    }

    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      logger.warn("[API] Unauthorized");

      useAuthStore.getState().clearAuth();
      useLayersStore.getState().clearLayers();
      useMapStore.getState().clearMapState();
    }

    logger.error(`[API Error] [${status ?? "Network"}]: ${error.message}`);

    return Promise.reject(error);
  },
);

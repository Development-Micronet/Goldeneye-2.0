import axios, { AxiosError } from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useMapStore } from "../features/data/store/useMapStore";
import { useAuthStore } from "../store/useAuthStore";
import { useLayersStore } from "../store/useLayersStore";
import { logger } from "../utils/logger";

const rawBase = import.meta.env.VITE_API_BASE_URL;
const cleanBase = rawBase
  .replace(/^(https?:\/\/)?/, "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const [host, port] = cleanBase.split(":");
const isHttps = rawBase.startsWith("https://");
const protocol = isHttps ? "https" : "http";
const useNipIo = !isHttps; // only for http .nip.io should be added
const DEFAULT_API_BASE_URL = `${protocol}://${cleanBase}/api/`;

export const apiClient: AxiosInstance = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically inject authorization header and manage dynamic multi-tenant baseURL
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = useAuthStore.getState();
    const token = state.accessToken;
    const user = state.user;

    // Dynamically adjust API base URL based on logged in tenant schema_name
    if (
      user &&
      user.schema_name &&
      user.schema_name.toLowerCase() !== "public" &&
      user.roleName.toLowerCase() !== "superadmin"
    ) {
      const tenantHost = useNipIo
        ? `${user.schema_name}.${host}.nip.io`
        : `${user.schema_name}.${host}`;
      const tenantBase = port ? `${tenantHost}:${port}` : tenantHost;
      config.baseURL = `${protocol}://${tenantBase}/api/`;
      logger.log(`[Dynamic Tenant URL]: ${protocol}://${tenantBase}/api/`);
    } else {
      config.baseURL = DEFAULT_API_BASE_URL;
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Handle global response behaviors and error codes
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;

    // Global 401 Unauthorized handling (e.g. session expired)
    if (status === 401) {
      logger.warn("[API] Unauthorized access. Clearing local sessions.");
      useAuthStore.getState().clearAuth();
      useLayersStore.getState().clearLayers();
      useMapStore.getState().clearMapState();

      // Optional: Redirection to login page or dispatching logout event
      // window.location.href = '/login';
    }

    // Log API errors globally for debuggability
    const errMsg =
      (error.response?.data as any)?.message ||
      error.message ||
      "An unknown network error occurred";
    logger.error(`[API Error] [${status || "Network"}]: ${errMsg}`);

    return Promise.reject(error);
  },
);

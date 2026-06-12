import { apiClient } from "../../../api/apiClient";
import { useAuthStore } from "../../../store/useAuthStore";
import { useLayersStore } from "../../../store/useLayersStore";
import { useMapStore } from "../../data/store/useMapStore";

/**
 * Performs backend logout via POST to auth/logout/ and clears the local auth session.
 * Always ensures the client-side session is cleared even if the network call fails.
 */
export const performLogout = async (): Promise<void> => {
  const refreshToken = useAuthStore.getState().refreshToken;
  
  try {
    // Send POST request to auth/logout/ endpoint
    await apiClient.post("auth/logout/", { refresh: refreshToken });
  } catch (err) {
    console.error("[Logout Error]: Failed to notify server of logout session", err);
  } finally {
    // Always clear credentials from local state to logout user on frontend
    useAuthStore.getState().clearAuth();
    
    // Clear all map layers from the store
    useLayersStore.getState().clearLayers();
    
    // Reset all map options and states completely
    useMapStore.getState().clearMapState();
  }
};

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useProductStore } from "../features/data/hooks/useproductStore";

export interface User {
  user: string;
  roleName: string;
  first_name: string;
  last_name: string;
  email: string;
  date_joined: string;
  parentUsername: string;
  mobile_number: string | null;
  address: string;
  customerName: string;
  schema_name?: string;
  domain_name?: string;
  date: string;
  must_reset_password?: boolean; // <-- Add this line
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) => {
        useProductStore.getState().resetProductStore();
        set({ accessToken, refreshToken, user });
      },
      clearAuth: () => {
        useProductStore.getState().resetProductStore();
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: "auth-storage",
      // Use sessionStorage instead of localStorage so auth data clears automatically
      // when the browser tab/session is closed, requiring re-login on next visit.
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

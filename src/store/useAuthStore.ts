import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: "auth-storage", // localStorage key
    },
  ),
);

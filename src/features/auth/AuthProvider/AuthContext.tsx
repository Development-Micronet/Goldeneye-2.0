import React, { createContext, useEffect, useState, useContext } from "react";
import { useAuthStore } from "../../../store/useAuthStore";

interface UserProviderProps {
  children: any;
}

const UserContext = createContext<any>(null);

export const UserProvider = ({ children }: UserProviderProps) => {
  const [userName, setUsername] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [parentUsername, setParentName] = useState<any>(null);
  const [accesstoken, setaccesstoken] = useState<any>(null);

  const [user, setUser] = useState<any>(() => {
    // Load user from sessionStorage if available
    const savedUser = sessionStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData: any) => {
    setUser(userData);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setRole(null);
    setAccess(null);
    setUsername(null);
    setUser(null);
    setParentName(null);
    sessionStorage.removeItem("user");
    sessionStorage.clear();
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("user");
    const tokenData = raw ? JSON.parse(raw) : null;
    if (tokenData) {
      setUsername(tokenData?.user);
      setAccess(tokenData?.access);
      setRole(tokenData?.roleName);
      setParentName(tokenData?.parentUsername);
    }
  }, [userName, access, user]);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        userName,
        access,
        role,
        parentUsername,
        accesstoken,
        setaccesstoken,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context) return context;

  const authUser = useAuthStore.getState().user;
  return {
    user: authUser,
    role: authUser?.roleName || "",
    userName: authUser?.user || "",
    access: useAuthStore.getState().accessToken,
    logout: () => useAuthStore.getState().clearAuth(),
  };
};

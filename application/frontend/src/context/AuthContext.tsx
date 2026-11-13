import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, TOKEN_STORAGE_KEY, User, LoginPayload, RegisterPayload, ProfileUpdatePayload } from "../api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
      setToken(storedToken);
    } catch {
      // Invalid/expired token
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();

    // Listen for global 401 events dispatched by Axios interceptor
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("deploystack:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("deploystack:unauthorized", handleUnauthorized);
    };
  }, [refreshUser, logout]);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
      setToken(response.access_token);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      // 1. Register user
      await authApi.register(payload);
      // 2. Automatically log in to get bearer token and user session
      const tokenResp = await authApi.login({
        email: payload.email,
        password: payload.password,
      });
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenResp.access_token);
      setToken(tokenResp.access_token);
      setUser(tokenResp.user);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (payload: ProfileUpdatePayload): Promise<User> => {
    const updated = await authApi.updateProfile(payload);
    setUser(updated);
    return updated;
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

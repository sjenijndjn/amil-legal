"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, clearAuthSession, getAccessToken } from "./api";
import { SEED_USER_PROFILE } from "./seed-data";
import { UserProfile } from "./types";

interface AuthContextValue {
  user: UserProfile;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  refreshProfile: () => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(SEED_USER_PROFILE);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    async function init() {
      try {
        const profile = await api.getProfile();
        setUser(profile);
        const preferred = profile.preferred_theme || "dark";
        setThemeState(preferred);
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", preferred);
        }
        const token = getAccessToken();
        if (!token && typeof window !== "undefined") {
          // Initialize owner workspace token automatically for seamless owner experience
          await api.login(profile.email);
        }
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const setTheme = async (nextTheme: "dark" | "light") => {
    setThemeState(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
    }
    const updated = await api.updateProfile({ preferred_theme: nextTheme });
    setUser(updated);
  };

  const refreshProfile = async () => {
    const profile = await api.getProfile();
    setUser(profile);
  };

  const login = async (email: string, password?: string) => {
    const res = await api.login(email, password);
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await api.register(email, password, displayName);
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await api.logout();
    clearAuthSession();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        theme,
        setTheme,
        refreshProfile,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

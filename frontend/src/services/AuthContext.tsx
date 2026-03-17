import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

interface User {
  id: number;
  username: string;
  full_name: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ replacedPreviousSession: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const res = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("access_token", res.data.access_token);
    // Prefer user from login response; do not fail login if /me has issues
    const userFromResponse = res.data.user;
    if (userFromResponse) {
      setUser(userFromResponse);
    } else {
      setUser({ id: 0, username, full_name: username });
    }

    const replacedPreviousSession = !!res.data.replaced_previous_session;
    return { replacedPreviousSession };
  };

  const logout = () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      // Fire-and-forget backend logout to invalidate server-side session
      api.post("/auth/logout").catch(() => {
        // ignore errors; client state will still be cleared
      });
    }
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};


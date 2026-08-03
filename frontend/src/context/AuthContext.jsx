import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = anon, {} = user
  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (err) {
      // Expected when user is not authenticated — /auth/me returns 401.
      // Don't overwrite a real user set by login while stale check is pending.
      if (err?.response?.status !== 401) {
        console.error("Auth check failed:", err);
      }
      setUser((cur) => (cur && cur.user_id ? cur : false));
    }
  }, []);

  useEffect(() => {
    // If session_id in URL (Google callback), skip pre-check; callback page handles it
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setUser(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try { await api.post("/auth/logout"); }
    catch (err) { console.error("Logout API error:", err); }
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, refresh: checkAuth, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

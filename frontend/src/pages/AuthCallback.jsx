import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const nav = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { nav("/login"); return; }
    const sessionId = match[1];
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId });
        window.history.replaceState({}, "", window.location.pathname);
        setUser(data);
        const me = await api.get("/auth/me");
        setUser(me.data);
        toast.success(`Welcome, ${data.name.split(" ")[0]}`);
        nav(data.role === "admin" ? "/admin" : "/dashboard");
      } catch (e) {
        toast.error("Google sign-in failed");
        nav("/login");
      }
    })();
  }, [location.hash, nav, setUser]);

  return (
    <div className="min-h-screen bg-ink-50 grid place-items-center">
      <div className="text-center">
        <div className="w-14 h-14 border-2 border-clay-200 border-t-clay-600 rounded-full animate-spin mx-auto mb-6" />
        <div className="mono text-ink-500 text-sm uppercase tracking-widest">Signing you in…</div>
      </div>
    </div>
  );
}

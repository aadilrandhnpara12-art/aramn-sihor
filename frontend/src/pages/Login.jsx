import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { GoogleLogo, SignIn } from "@phosphor-icons/react";

export default function Login() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setUser(data);
      toast.success(`Welcome back, ${data.name.split(" ")[0]}`);
      // Refresh full user (with slug) then navigate
      const me = await api.get("/auth/me");
      setUser(me.data);
      nav(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail, "Login failed"));
    } finally { setLoading(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="cyber-bg cyber-noise min-h-screen grid place-items-center p-6">
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center" data-testid="login-logo">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 grid place-items-center font-bold text-black">M</div>
          <span className="font-display font-semibold text-white text-xl">Menu<span className="text-cyan-400">Maker</span></span>
        </Link>
        <div className="cyber-card p-8">
          <div className="overline mb-2 text-cyan-300">Sign in</div>
          <h1 className="font-display font-bold text-3xl text-white mb-1 tracking-tight">Welcome back.</h1>
          <p className="text-white/50 text-sm mb-8">Access your restaurant dashboard.</p>

          <button onClick={googleLogin} data-testid="login-google" className="cyber-btn-ghost w-full justify-center mb-5">
            <GoogleLogo size={18} weight="bold" /> Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-xs mono text-white/40 uppercase">or</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="overline block mb-2">Email</label>
              <input required type="email" data-testid="login-email" className="cyber-input" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
            </div>
            <div>
              <label className="overline block mb-2">Password</label>
              <input required type="password" data-testid="login-password" className="cyber-input" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} />
            </div>
            <button disabled={loading} type="submit" data-testid="login-submit" className="cyber-btn w-full justify-center disabled:opacity-60">
              <SignIn size={16} weight="bold" /> {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-white/50">
            <Link to="/register" className="hover:text-cyan-400" data-testid="login-to-register">Create account</Link>
            <button onClick={async () => {
              const email = prompt("Enter your email to reset:");
              if (!email) return;
              try { await api.post("/auth/forgot-password", { email }); toast.success("If the email exists, a reset link has been sent."); }
              catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
            }} className="hover:text-cyan-400" data-testid="login-forgot">Forgot password?</button>
          </div>
        </div>
      </div>
    </div>
  );
}

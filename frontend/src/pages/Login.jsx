import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { GoogleLogo, SignIn, ArrowRight } from "@phosphor-icons/react";

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
    <div className="min-h-screen bg-ink-50 grid lg:grid-cols-2">
      {/* Left side - form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="login-logo">
            <div className="w-9 h-9 rounded-lg bg-ink-900 grid place-items-center"><span className="mono text-ink-50 font-bold text-sm">M</span></div>
            <span className="display font-semibold text-ink-900 text-xl">Menu<span className="text-clay-600">Maker</span></span>
          </Link>
          <div className="overline mb-3">Sign in</div>
          <h1 className="display font-semibold text-4xl text-ink-900 mb-2 leading-[1.05]">Welcome back.</h1>
          <p className="text-ink-600 mb-10">Access your restaurant dashboard.</p>

          <button onClick={googleLogin} data-testid="login-google" className="btn-ghost w-full mb-5">
            <GoogleLogo size={18} weight="bold" /> Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-6">
            <span className="flex-1 h-px bg-ink-200" />
            <span className="text-xs mono text-ink-400 uppercase">or with email</span>
            <span className="flex-1 h-px bg-ink-200" />
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="overline block mb-2">Email</label>
              <input required type="email" data-testid="login-email" className="input-field" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
            </div>
            <div>
              <label className="overline block mb-2">Password</label>
              <input required type="password" data-testid="login-password" className="input-field" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} />
            </div>
            <button disabled={loading} type="submit" data-testid="login-submit" className="btn-accent w-full disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"} <ArrowRight size={14} weight="bold" />
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between text-sm">
            <Link to="/register" className="btn-link" data-testid="login-to-register">Create account</Link>
            <button onClick={async () => {
              const email = prompt("Enter your email to reset:");
              if (!email) return;
              try { await api.post("/auth/forgot-password", { email }); toast.success("If the email exists, a reset link has been sent."); }
              catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
            }} className="text-ink-600 hover:text-ink-900" data-testid="login-forgot">Forgot password?</button>
          </div>
        </div>
      </div>

      {/* Right side - editorial */}
      <div className="hidden lg:block relative overflow-hidden bg-ink-900 text-ink-50 p-16">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="relative h-full flex flex-col justify-between">
          <Link to="/" className="text-ink-400 hover:text-ink-100 text-sm">← Back to home</Link>
          <div>
            <blockquote className="display text-4xl leading-tight font-medium">
              "We replaced our laminated menus in one afternoon.
              <span className="serif-italic text-clay-400"> Orders now come straight to WhatsApp</span> — no phone tag, no confusion."
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-clay-500 grid place-items-center display font-semibold text-lg">P</div>
              <div>
                <div className="font-medium">Priya S.</div>
                <div className="text-ink-400 text-sm">Owner, Spice Route</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-ink-500 mono">v1.1 · editorial</div>
        </div>
      </div>
    </div>
  );
}

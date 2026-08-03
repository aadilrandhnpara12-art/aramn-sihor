import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { GoogleLogo, UserPlus } from "@phosphor-icons/react";

export default function Register() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: "", restaurant_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      toast.success("Account created — 14 day trial started");
      const me = await api.get("/auth/me");
      setUser(me.data);
      nav("/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail, "Registration failed"));
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
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center" data-testid="register-logo">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 grid place-items-center font-bold text-black">M</div>
          <span className="font-display font-semibold text-white text-xl">Menu<span className="text-cyan-400">Maker</span></span>
        </Link>
        <div className="cyber-card p-8">
          <div className="overline mb-2 text-cyan-300">Sign up</div>
          <h1 className="font-display font-bold text-3xl text-white mb-1 tracking-tight">Start free for 14 days.</h1>
          <p className="text-white/50 text-sm mb-8">Your restaurant, your menu, your QR — in minutes.</p>

          <button onClick={googleLogin} data-testid="register-google" className="cyber-btn-ghost w-full justify-center mb-5">
            <GoogleLogo size={18} weight="bold" /> Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-xs mono text-white/40 uppercase">or</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="overline block mb-2">Your name</label>
                <input required data-testid="register-name" className="cyber-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
              </div>
              <div>
                <label className="overline block mb-2">Restaurant</label>
                <input required data-testid="register-restaurant" className="cyber-input" value={form.restaurant_name} onChange={(e)=>setForm({...form,restaurant_name:e.target.value})} />
              </div>
            </div>
            <div>
              <label className="overline block mb-2">Email</label>
              <input required type="email" data-testid="register-email" className="cyber-input" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
            </div>
            <div>
              <label className="overline block mb-2">Password</label>
              <input required type="password" minLength={6} data-testid="register-password" className="cyber-input" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} />
            </div>
            <button disabled={loading} type="submit" data-testid="register-submit" className="cyber-btn w-full justify-center disabled:opacity-60">
              <UserPlus size={16} weight="bold" /> {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-sm text-white/50 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-cyan-400 hover:underline" data-testid="register-to-login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

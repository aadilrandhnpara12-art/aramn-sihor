import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { GoogleLogo, ArrowRight } from "@phosphor-icons/react";

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
      setUser(data);
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
    <div className="min-h-screen bg-ink-50 grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="register-logo">
            <div className="w-9 h-9 rounded-lg bg-ink-900 grid place-items-center"><span className="mono text-ink-50 font-bold text-sm">M</span></div>
            <span className="display font-semibold text-ink-900 text-xl">Menu<span className="text-clay-600">Maker</span></span>
          </Link>
          <div className="overline mb-3">Sign up</div>
          <h1 className="display font-semibold text-4xl text-ink-900 mb-2 leading-[1.05]">Start free — <span className="serif-italic text-clay-600">14 days.</span></h1>
          <p className="text-ink-600 mb-10">Your restaurant, your menu, your QR — in minutes.</p>

          <button onClick={googleLogin} data-testid="register-google" className="btn-ghost w-full mb-5">
            <GoogleLogo size={18} weight="bold" /> Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-6">
            <span className="flex-1 h-px bg-ink-200" />
            <span className="text-xs mono text-ink-400 uppercase">or with email</span>
            <span className="flex-1 h-px bg-ink-200" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="overline block mb-2">Your name</label>
                <input required data-testid="register-name" className="input-field" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
              </div>
              <div>
                <label className="overline block mb-2">Restaurant</label>
                <input required data-testid="register-restaurant" className="input-field" value={form.restaurant_name} onChange={(e)=>setForm({...form,restaurant_name:e.target.value})} />
              </div>
            </div>
            <div>
              <label className="overline block mb-2">Email</label>
              <input required type="email" data-testid="register-email" className="input-field" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
            </div>
            <div>
              <label className="overline block mb-2">Password</label>
              <input required type="password" minLength={6} data-testid="register-password" className="input-field" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} />
              <div className="text-xs text-ink-500 mt-1.5">Min 6 characters.</div>
            </div>
            <button disabled={loading} type="submit" data-testid="register-submit" className="btn-accent w-full disabled:opacity-60">
              {loading ? "Creating..." : "Create account"} <ArrowRight size={14} weight="bold" />
            </button>
          </form>

          <div className="mt-8 text-sm text-ink-600 text-center">
            Already have an account? <Link to="/login" className="btn-link" data-testid="register-to-login">Sign in</Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative overflow-hidden bg-clay-600 text-white p-16">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="relative h-full flex flex-col justify-between">
          <Link to="/" className="text-white/70 hover:text-white text-sm">← Back to home</Link>
          <div>
            <div className="overline text-white/70 mb-4">Included in free</div>
            <ul className="space-y-4 display text-2xl font-medium leading-tight">
              <li className="flex items-baseline gap-3"><span className="mono text-sm text-white/70">01</span> Full menu builder, unlimited edits.</li>
              <li className="flex items-baseline gap-3"><span className="mono text-sm text-white/70">02</span> QR code — <span className="serif-italic">yours to keep.</span></li>
              <li className="flex items-baseline gap-3"><span className="mono text-sm text-white/70">03</span> WhatsApp order flow, live from day one.</li>
              <li className="flex items-baseline gap-3"><span className="mono text-sm text-white/70">04</span> Custom colours, logo, banner.</li>
            </ul>
          </div>
          <div className="text-xs text-white/60 mono">v1.1 · editorial</div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import PublicNav from "../components/layout/PublicNav";
import { api } from "../lib/api";
import { Link } from "react-router-dom";
import { Check, Sparkle } from "@phosphor-icons/react";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { api.get("/plans").then(r => setPlans(r.data)).catch(() => {}); }, []);

  return (
    <div className="cyber-bg cyber-noise min-h-screen">
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <PublicNav />
      <section className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-32">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="overline mb-4 text-cyan-300">Pricing</div>
          <h1 className="font-display font-bold text-5xl lg:text-6xl text-white tracking-tight leading-tight">
            Pay for the <span className="text-cyan-400">growth</span>.<br /> Not the software.
          </h1>
          <p className="mt-6 text-white/60">Cancel anytime. Free trial on every paid plan.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => (
            <div
              key={p.id}
              data-testid={`plan-${p.id}`}
              className={`cyber-card p-8 relative ${p.popular ? "cyber-glow-fuchsia border-fuchsia-500/40" : ""}`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 warm-pill bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-black mono uppercase tracking-wider">
                  Popular
                </div>
              )}
              <div className="font-display font-semibold text-lg text-white">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="mono text-4xl font-bold text-white">${p.price}</span>
                <span className="text-white/50 text-sm">/{p.period}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="text-sm text-white/70 flex gap-2">
                    <Check size={16} weight="bold" className="text-cyan-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={p.id === "free" ? "/register" : "/contact"}
                data-testid={`plan-cta-${p.id}`}
                className={`mt-8 w-full text-center block ${p.popular ? "cyber-btn" : "cyber-btn-ghost"}`}
              >
                {p.id === "free" ? <><Sparkle size={16} weight="fill" /> Start free</> : p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-white/40 text-xs mono uppercase tracking-widest">
          Paid plans coming soon · Contact us to activate manually
        </div>
      </section>
    </div>
  );
}

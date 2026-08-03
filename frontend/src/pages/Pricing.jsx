import React, { useEffect, useState } from "react";
import PublicNav from "../components/layout/PublicNav";
import { api } from "../lib/api";
import { Link } from "react-router-dom";
import { Check, Sparkle, ArrowRight, WhatsappLogo } from "@phosphor-icons/react";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [platform, setPlatform] = useState({ whatsapp: "917226978918", currency: "₹" });

  useEffect(() => {
    api.get("/plans").then(r => setPlans(r.data)).catch(() => {});
    api.get("/platform-config").then(r => setPlatform(r.data)).catch(() => {});
  }, []);

  const payViaWhatsapp = (plan) => {
    const msg = `Hi MenuMaker team! I want to activate the *${plan.name}* plan (${platform.currency}${plan.price}/${plan.period}). My restaurant name: ______  Registered email: ______  Please share payment details.`;
    const url = `https://wa.me/${platform.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <PublicNav />
      <section className="container-editorial pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <div className="overline mb-4">Pricing</div>
          <h1 className="display font-semibold text-5xl lg:text-7xl leading-[0.98] text-ink-900">
            Simple pricing, <span className="serif-italic text-clay-600">honest math.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-600 leading-relaxed">
            Start free. Pay by WhatsApp when ready. Cancel with a single click.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              data-testid={`plan-${p.id}`}
              className={`relative rounded-2xl p-8 flex flex-col ${p.popular ? "bg-ink-900 text-ink-50 border border-ink-900 shadow-xl" : "card-editorial"}`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill bg-clay-600 text-white text-xs">
                  <Sparkle size={12} weight="fill" /> Most popular
                </div>
              )}
              <div className="display text-xl font-semibold">{p.name}</div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="display mono text-5xl font-bold">{platform.currency}{p.price}</span>
                <span className={p.popular ? "text-ink-400" : "text-ink-500"}>/{p.period}</span>
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="text-sm flex gap-2">
                    <Check size={16} weight="bold" className={p.popular ? "text-clay-400 mt-0.5 shrink-0" : "text-clay-600 mt-0.5 shrink-0"} />
                    <span className={p.popular ? "text-ink-100" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              {p.id === "free" ? (
                <Link to="/register" data-testid={`plan-cta-${p.id}`} className={`mt-8 w-full ${p.popular ? "btn-accent" : "btn-ghost"}`}>
                  Start free <ArrowRight size={14} weight="bold" />
                </Link>
              ) : (
                <button
                  onClick={()=>payViaWhatsapp(p)}
                  data-testid={`plan-cta-${p.id}`}
                  className={`mt-8 w-full ${p.popular ? "btn-accent" : "btn-ghost"}`}
                >
                  <WhatsappLogo size={16} weight="fill" /> Pay via WhatsApp
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 text-center max-w-xl mx-auto space-y-3">
          <div className="pill bg-moss-50 text-moss-700 border border-moss-500/30 mx-auto inline-flex">
            <WhatsappLogo size={14} weight="fill" /> Direct WhatsApp activation — no card details, no forms
          </div>
          <div className="text-sm text-ink-500">Message us on <a href={`https://wa.me/${platform.whatsapp}`} className="btn-link" data-testid="wa-direct">+91 {platform.whatsapp.replace(/^91/, "")}</a> — we activate within 5 minutes on business days.</div>
        </div>
      </section>
    </div>
  );
}

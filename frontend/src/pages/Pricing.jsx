import React, { useEffect, useState } from "react";
import PublicNav from "../components/layout/PublicNav";
import { api } from "../lib/api";
import { Link } from "react-router-dom";
import { Check, Sparkle, ArrowRight } from "@phosphor-icons/react";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  useEffect(() => { api.get("/plans").then(r => setPlans(r.data)).catch(() => {}); }, []);

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
            Start free. Grow into a plan when you're ready. Cancel with a single click.
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
                <span className="display mono text-5xl font-bold">${p.price}</span>
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
              <Link
                to={p.id === "free" ? "/register" : "/contact"}
                data-testid={`plan-cta-${p.id}`}
                className={`mt-8 w-full ${p.popular ? "btn-accent" : "btn-ghost"}`}
              >
                {p.id === "free" ? "Start free" : p.cta} <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center text-sm text-ink-500">
          Paid plans currently activated manually by our team — <Link className="btn-link" to="/contact">contact us</Link> to upgrade.
        </div>
      </section>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import PublicNav from "../components/layout/PublicNav";
import { QrCode, Sparkle, Storefront, WhatsappLogo, ChartLineUp, Palette, DeviceMobile } from "@phosphor-icons/react";

export default function Landing() {
  return (
    <div className="cyber-bg cyber-noise min-h-screen relative">
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <PublicNav />

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-32">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 relative z-10 animate-fade-up">
            <div className="overline mb-6 flex items-center gap-3">
              <span className="inline-block w-8 h-px bg-cyan-400" />
              <span>Digital QR Menu · SaaS</span>
            </div>
            <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-white">
              Your menu, <br />
              <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">scanned to life.</span>
            </h1>
            <p className="mt-8 text-white/70 text-lg max-w-xl leading-relaxed">
              Build a mobile-first QR menu for your restaurant in minutes. Customers scan, browse gorgeous
              food photos, and order via WhatsApp — no app, no friction.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/register" data-testid="hero-cta-start" className="cyber-btn">
                <Sparkle size={18} weight="fill" />
                Start free — 14 days
              </Link>
              <Link to="/features" data-testid="hero-cta-features" className="cyber-btn-ghost">
                See features
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-6 text-xs text-white/50 mono uppercase tracking-widest">
              <span>· No credit card</span>
              <span>· WhatsApp orders</span>
              <span>· Custom QR</span>
            </div>
          </div>

          {/* QR Hero Card */}
          <div className="lg:col-span-5 relative z-10">
            <div className="cyber-card cyber-glow-cyan p-8 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <span className="overline text-cyan-300">Live QR</span>
                  <span className="mono text-xs text-white/50">menu.link/neon-diner</span>
                </div>
                <div className="scan-line-wrap bg-white rounded-2xl p-6 aspect-square grid place-items-center">
                  <QrCode size={190} weight="regular" color="#05050A" />
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <div className="font-display font-semibold text-white">Neon Diner</div>
                    <div className="text-xs text-white/50 mono">Table 12 · 3 items · $24.50</div>
                  </div>
                  <div className="cyber-btn text-xs !py-2 !px-3">
                    <WhatsappLogo size={14} weight="fill" /> Order
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature bento */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-10 pb-32">
        <div className="mb-16 max-w-2xl">
          <div className="overline mb-4">The stack</div>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight leading-tight">
            Everything you need to run<br />a <span className="text-cyan-400">digital-first</span> restaurant.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Storefront, title: "Menu builder", desc: "Unlimited categories, items, badges — veg, spicy, bestseller. Reorder with a drag." },
            { icon: QrCode, title: "Dynamic QR codes", desc: "Restaurant + table QRs. Download PNG. Print & stick anywhere." },
            { icon: WhatsappLogo, title: "WhatsApp ordering", desc: "Zero-friction cart pushes formatted order to your WhatsApp — no app." },
            { icon: ChartLineUp, title: "Live analytics", desc: "Scan counts, popular items, order trends, all in one panel." },
            { icon: Palette, title: "Custom themes", desc: "Warm & appetizing, or dark cyber. Your brand, your palette." },
            { icon: DeviceMobile, title: "Mobile-first", desc: "PWA-ready, blazing fast, works on every phone. No downloads." },
          ].map((f, i) => (
            <div key={f.title} className="cyber-card p-8 transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: `${i * 60}ms` }} data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g,'-')}`}>
              <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 grid place-items-center mb-6 text-cyan-300">
                <f.icon size={22} weight="duotone" />
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-6xl mx-auto px-6 lg:px-10 pb-32">
        <div className="cyber-card p-12 md:p-16 text-center overflow-hidden relative">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_0%,rgba(0,240,255,0.25),transparent_60%)]" />
          <div className="relative">
            <div className="overline mb-6 text-cyan-300">Ready when you are</div>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight mb-6">
              Launch your QR menu in 5 minutes.
            </h2>
            <p className="text-white/60 max-w-xl mx-auto mb-10">
              14-day trial. No credit card. Cancel anytime. Your customers will thank you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" data-testid="cta-final-signup" className="cyber-btn">Create free account</Link>
              <Link to="/pricing" data-testid="cta-final-pricing" className="cyber-btn-ghost">View pricing</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 mt-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap items-center justify-between gap-4 text-white/50 text-sm">
          <div>© {new Date().getFullYear()} MenuMaker. Crafted for restaurants.</div>
          <div className="flex gap-6">
            <Link to="/features" className="hover:text-white">Features</Link>
            <Link to="/pricing" className="hover:text-white">Pricing</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import PublicNav from "../components/layout/PublicNav";
import {
  QrCode, Storefront, WhatsappLogo, ChartLineUp, Palette, DeviceMobile,
  Sparkle, ArrowRight, Star, ShieldCheck, Lightning, Check, Quotes,
  MinusCircle, PlusCircle
} from "@phosphor-icons/react";

const stats = [
  { n: "5 min", l: "Setup time" },
  { n: "0", l: "Apps to install" },
  { n: "24/7", l: "Order taking" },
  { n: "∞", l: "Menu items" },
];

const howItWorks = [
  { n: "01", t: "Create your menu", d: "Add categories, items, photos, badges. Set prices in your currency." },
  { n: "02", t: "Generate QR codes", d: "One for the restaurant, one per table. Download as PNG or SVG." },
  { n: "03", t: "Customers order", d: "They scan, browse, and place orders straight to your WhatsApp." },
];

const testimonials = [
  { name: "Priya S.", role: "Owner, Spice Route", quote: "We replaced our laminated menus in one afternoon. Orders now come straight to WhatsApp — no phone tag, no confusion.", stars: 5 },
  { name: "Marco B.", role: "Chef, Trattoria Nord", quote: "The AI descriptions are shockingly good. My team saved a full weekend of copywriting.", stars: 5 },
  { name: "Anaya K.", role: "Founder, Little Loafs", quote: "Cloud-kitchen ready. Customers scan, order, done. Setup was faster than making a latte.", stars: 5 },
];

const faqs = [
  { q: "Do my customers need to download an app?", a: "No — they just scan and browse in their phone's browser. Zero friction." },
  { q: "Can I get a QR code for each table?", a: "Yes. Create unlimited tables in the dashboard and download each QR as PNG or SVG." },
  { q: "How do orders reach me?", a: "The customer's cart is formatted into a WhatsApp message sent directly to your number. You confirm in WhatsApp." },
  { q: "Can I change my menu anytime?", a: "Yes — edits are live within seconds. Availability toggles let you turn items on/off instantly." },
  { q: "Is there a free plan?", a: "Yes. The Free plan lets you build and publish your menu forever. Paid plans unlock analytics, AI, unlimited tables and more." },
];

function FaqItem({ q, a, idx }) {
  const [open, setOpen] = React.useState(idx === 0);
  return (
    <div className="border-b border-ink-200 py-6" data-testid={`faq-${idx}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between gap-6 text-left">
        <span className="text-lg text-ink-900 font-medium">{q}</span>
        <span className="text-clay-600 mt-1 shrink-0">{open ? <MinusCircle size={22} weight="regular" /> : <PlusCircle size={22} weight="regular" />}</span>
      </button>
      {open && <div className="mt-3 text-ink-600 leading-relaxed pr-10">{a}</div>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <PublicNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
        <div className="container-editorial relative pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 animate-fade-up">
              <div className="inline-flex items-center gap-2 pill bg-clay-50 border border-clay-100 text-clay-700 mb-8">
                <Sparkle size={12} weight="fill" /> New — AI menu descriptions
              </div>
              <h1 className="display font-semibold text-[3.4rem] sm:text-6xl lg:text-7xl leading-[0.98] tracking-tight text-ink-900">
                The menu <span className="serif-italic text-clay-600">restaurants</span> deserve —<br />
                born on a phone.
              </h1>
              <p className="mt-8 text-lg text-ink-600 leading-relaxed max-w-xl">
                MenuMaker turns any restaurant, café or cloud kitchen into a scan-to-order experience.
                No apps, no downloads. Customers scan, browse gorgeous photos, and order in seconds — via WhatsApp.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link to="/register" data-testid="hero-cta-start" className="btn-accent">
                  Start free — 14 days <ArrowRight size={16} weight="bold" />
                </Link>
                <Link to="/features" data-testid="hero-cta-features" className="btn-ghost">
                  Explore features
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-ink-500">
                <div className="flex items-center gap-2"><Check size={16} className="text-clay-600" weight="bold" /> No credit card</div>
                <div className="flex items-center gap-2"><Check size={16} className="text-clay-600" weight="bold" /> 5-minute setup</div>
                <div className="flex items-center gap-2"><Check size={16} className="text-clay-600" weight="bold" /> Cancel anytime</div>
              </div>
            </div>

            <div className="lg:col-span-5 animate-fade-in relative">
              <div className="relative">
                {/* Phone mockup */}
                <div className="mx-auto w-[280px] bg-ink-900 rounded-[2.5rem] p-2 shadow-2xl relative z-10">
                  <div className="bg-ink-50 rounded-[2rem] overflow-hidden">
                    <div className="h-6 bg-ink-900 grid place-items-center">
                      <div className="w-16 h-1 rounded-full bg-ink-600" />
                    </div>
                    <div className="p-4">
                      <div className="h-24 rounded-xl bg-gradient-to-br from-clay-200 to-clay-500 mb-3 flex items-end p-3">
                        <div>
                          <div className="text-xs text-white/90 mono">TABLE 12</div>
                          <div className="display text-white font-bold text-lg">Spice Route</div>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3 overflow-hidden">
                        <span className="pill bg-ink-900 text-white text-[10px]">Starters</span>
                        <span className="pill bg-white border border-ink-200 text-ink-700 text-[10px]">Mains</span>
                        <span className="pill bg-white border border-ink-200 text-ink-700 text-[10px]">Drinks</span>
                      </div>
                      {[
                        { n: "Truffle Fries", p: "8.5", v: true },
                        { n: "Wagyu Burger", p: "18.0", v: false, best: true },
                      ].map((it) => (
                        <div key={it.n} className="flex gap-2 items-center p-2 rounded-lg mb-2 border border-ink-100">
                          <div className="w-12 h-12 rounded-md bg-clay-100" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className={`w-2.5 h-2.5 border ${it.v ? "border-moss-600" : "border-clay-600"} grid place-items-center`}><span className={`w-1 h-1 rounded-full ${it.v ? "bg-moss-600" : "bg-clay-600"}`} /></span>
                              {it.best && <span className="text-[9px] pill bg-amber-100 text-amber-800 !py-0 !px-1.5">Best</span>}
                            </div>
                            <div className="text-xs display font-semibold text-ink-900 leading-tight mt-0.5">{it.n}</div>
                            <div className="text-[10px] mono text-ink-600">${it.p}</div>
                          </div>
                          <button className="w-6 h-6 rounded-full bg-clay-600 text-white text-xs grid place-items-center">+</button>
                        </div>
                      ))}
                      <button className="w-full py-2 rounded-full bg-ink-900 text-white text-xs font-medium flex items-center justify-center gap-1.5">
                        <WhatsappLogo size={12} weight="fill" /> Order via WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
                {/* Decorative QR floating */}
                <div className="absolute -left-4 -top-6 rotate-[-8deg] bg-white p-3 rounded-2xl shadow-xl border border-ink-200 z-0">
                  <QrCode size={72} weight="regular" color="#0F0E0C" />
                  <div className="text-[9px] mono text-ink-500 text-center mt-1">SCAN ME</div>
                </div>
                <div className="absolute -right-4 top-16 rotate-[6deg] bg-white px-3 py-2 rounded-xl shadow-lg border border-ink-200 z-0 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-moss-500 grid place-items-center"><WhatsappLogo size={12} weight="fill" color="white" /></div>
                    <div>
                      <div className="text-ink-900 font-medium">New order</div>
                      <div className="text-ink-500 text-[10px] mono">Table 12 · $26.50</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.l} className="text-center sm:text-left border-t border-ink-200 pt-5">
                <div className="display text-4xl text-ink-900 font-semibold">{s.n}</div>
                <div className="text-xs uppercase tracking-widest text-ink-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUSTED BY (marquee) */}
      <section className="border-y border-ink-200 py-8 overflow-hidden bg-white/60">
        <div className="container-editorial">
          <div className="text-center overline mb-6">Trusted by 400+ restaurants worldwide</div>
        </div>
        <div className="marquee-track whitespace-nowrap">
          {[..."Spice Route · Trattoria Nord · Little Loafs · Blue Moon Café · Urban Diner · Kai Sushi · Barrio Grill · The Bakery Lab · Fumo Ramen · Chai Chowk".split(" · "),
            ..."Spice Route · Trattoria Nord · Little Loafs · Blue Moon Café · Urban Diner · Kai Sushi · Barrio Grill · The Bakery Lab · Fumo Ramen · Chai Chowk".split(" · ")].map((n, i) => (
            <span key={i} className="display text-2xl text-ink-400 italic">{n}</span>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-editorial py-24 lg:py-32">
        <div className="max-w-3xl mb-20">
          <div className="overline mb-4">How it works</div>
          <h2 className="display text-4xl lg:text-6xl font-semibold text-ink-900 leading-[1.02]">
            From <span className="serif-italic text-clay-600">idea</span> to<br /> ordering, in three steps.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {howItWorks.map((step, i) => (
            <div key={step.n} className="card-editorial p-8 relative" data-testid={`step-${i+1}`}>
              <div className="mono text-clay-600 text-sm">{step.n}</div>
              <h3 className="display text-2xl font-semibold text-ink-900 mt-4">{step.t}</h3>
              <p className="text-ink-600 mt-3 leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE BENTO */}
      <section className="container-editorial py-24 lg:py-32">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 card-editorial p-10 relative overflow-hidden bg-ink-900 text-ink-50 border-ink-900" data-testid="bento-hero">
            <div className="relative z-10 max-w-md">
              <div className="overline text-clay-200">Ordering</div>
              <h3 className="display text-4xl lg:text-5xl font-semibold mt-3 leading-tight">
                Every scan ends in your WhatsApp.
              </h3>
              <p className="mt-4 text-ink-300 leading-relaxed">
                No third-party apps. No commission cuts. Customers scan the QR, place the order,
                and it lands as a formatted message in your WhatsApp — table number and all.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-56 h-56 bg-clay-500/30 rounded-full blur-3xl" />
            <div className="absolute right-8 top-8 w-14 h-14 rounded-full bg-moss-500 grid place-items-center">
              <WhatsappLogo size={26} weight="fill" color="white" />
            </div>
          </div>
          <div className="card-editorial p-8" data-testid="bento-ai">
            <div className="w-10 h-10 rounded-lg bg-clay-50 text-clay-600 grid place-items-center mb-6"><Sparkle size={20} weight="fill" /></div>
            <h3 className="display text-2xl font-semibold text-ink-900">AI menu writer</h3>
            <p className="mt-3 text-ink-600 leading-relaxed">Generate mouth-watering item descriptions in one click.</p>
          </div>
          <div className="card-editorial p-8" data-testid="bento-qr">
            <div className="w-10 h-10 rounded-lg bg-ink-50 border border-ink-200 grid place-items-center mb-6"><QrCode size={20} weight="regular" /></div>
            <h3 className="display text-2xl font-semibold text-ink-900">Dynamic QR codes</h3>
            <p className="mt-3 text-ink-600 leading-relaxed">Table-level QRs. Download as PNG or SVG. Print and stick.</p>
          </div>
          <div className="card-editorial p-8" data-testid="bento-analytics">
            <div className="w-10 h-10 rounded-lg bg-ink-50 border border-ink-200 grid place-items-center mb-6"><ChartLineUp size={20} weight="regular" /></div>
            <h3 className="display text-2xl font-semibold text-ink-900">Live analytics</h3>
            <p className="mt-3 text-ink-600 leading-relaxed">Scans, orders and most-loved items — all in one panel.</p>
          </div>
          <div className="card-editorial p-8" data-testid="bento-themes">
            <div className="w-10 h-10 rounded-lg bg-ink-50 border border-ink-200 grid place-items-center mb-6"><Palette size={20} weight="regular" /></div>
            <h3 className="display text-2xl font-semibold text-ink-900">Themed menus</h3>
            <p className="mt-3 text-ink-600 leading-relaxed">Your brand, your palette. Warm, dark or minimal — you decide.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-ink-900 text-ink-50 py-24 lg:py-32">
        <div className="container-editorial">
          <div className="max-w-2xl mb-16">
            <div className="overline text-clay-200 mb-4">Loved by owners</div>
            <h2 className="display text-4xl lg:text-6xl font-semibold leading-[1.05]">
              Restaurants that ship <span className="serif-italic text-clay-400">stories</span> — not just menus.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={t.name} className="bg-ink-800 border border-ink-700 rounded-2xl p-8" data-testid={`testimonial-${i}`}>
                <Quotes size={28} weight="fill" className="text-clay-400 mb-6" />
                <p className="text-ink-100 leading-relaxed">{t.quote}</p>
                <div className="mt-6 flex items-center gap-3 pt-6 border-t border-ink-700">
                  <div className="w-10 h-10 rounded-full bg-clay-500 grid place-items-center display font-semibold">{t.name.slice(0,1)}</div>
                  <div>
                    <div className="text-ink-50 font-medium text-sm">{t.name}</div>
                    <div className="text-ink-400 text-xs">{t.role}</div>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({length: t.stars}).map((_, s) => <Star key={s} size={12} weight="fill" className="text-clay-400" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-editorial py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4">
            <div className="overline mb-4">FAQ</div>
            <h2 className="display text-4xl lg:text-5xl font-semibold text-ink-900 leading-tight">
              Quick answers, <span className="serif-italic text-clay-600">no small print.</span>
            </h2>
            <p className="mt-4 text-ink-600 leading-relaxed">Still curious? <Link to="/contact" className="btn-link">Get in touch →</Link></p>
          </div>
          <div className="lg:col-span-8">
            {faqs.map((f, i) => <FaqItem key={f.q} q={f.q} a={f.a} idx={i} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-editorial pb-24 lg:pb-32">
        <div className="card-editorial p-12 md:p-20 text-center bg-clay-600 border-clay-600 text-ink-50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 grid-pattern" />
          <div className="relative">
            <h2 className="display text-4xl lg:text-6xl font-semibold leading-[1.05] max-w-3xl mx-auto">
              Give your customers a menu they'll actually enjoy scanning.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/register" data-testid="cta-final-signup" className="btn-primary bg-ink-900 hover:bg-ink-800">
                Create free account <ArrowRight size={16} weight="bold" />
              </Link>
              <Link to="/pricing" data-testid="cta-final-pricing" className="btn-ghost text-ink-50 border-ink-50/40 hover:bg-ink-50/10 hover:border-ink-50">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-ink-200 py-14 bg-ink-50">
        <div className="container-editorial grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ink-900 grid place-items-center"><span className="mono text-ink-50 font-bold text-sm">M</span></div>
              <span className="display font-semibold text-ink-900">MenuMaker</span>
            </div>
            <p className="text-sm text-ink-500 leading-relaxed">Digital QR menus for restaurants that care about the customer's first taste.</p>
          </div>
          <div>
            <div className="overline mb-4">Product</div>
            <div className="space-y-2 text-sm">
              <Link to="/features" className="block text-ink-700 hover:text-ink-900">Features</Link>
              <Link to="/pricing" className="block text-ink-700 hover:text-ink-900">Pricing</Link>
              <Link to="/register" className="block text-ink-700 hover:text-ink-900">Start free</Link>
            </div>
          </div>
          <div>
            <div className="overline mb-4">Company</div>
            <div className="space-y-2 text-sm">
              <Link to="/contact" className="block text-ink-700 hover:text-ink-900">Contact</Link>
              <a className="block text-ink-700 hover:text-ink-900" href="#">Privacy</a>
              <a className="block text-ink-700 hover:text-ink-900" href="#">Terms</a>
            </div>
          </div>
          <div>
            <div className="overline mb-4">Get started</div>
            <Link to="/register" className="btn-accent text-sm !py-2">Create your menu →</Link>
          </div>
        </div>
        <div className="container-editorial mt-10 pt-6 border-t border-ink-200 text-xs text-ink-500 flex justify-between flex-wrap gap-3">
          <span>© {new Date().getFullYear()} MenuMaker. Crafted for restaurants worldwide.</span>
          <span className="mono">v1.1 · editorial</span>
        </div>
      </footer>
    </div>
  );
}

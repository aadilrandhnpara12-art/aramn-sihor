import React from "react";
import PublicNav from "../components/layout/PublicNav";
import { QrCode, Storefront, WhatsappLogo, ChartLineUp, Palette, DeviceMobile, Sparkle, Users, Camera, GlobeStand, ForkKnife, Notepad } from "@phosphor-icons/react";

const groups = [
  {
    title: "Menu Management",
    items: [
      { icon: Storefront, title: "Unlimited categories & items", desc: "Organize your menu exactly how you serve it." },
      { icon: Camera, title: "Rich item photos", desc: "Upload beautiful images that make orders happen." },
      { icon: ForkKnife, title: "Badges & modifiers", desc: "Veg, non-veg, spicy level, bestseller, availability toggle." },
      { icon: Sparkle, title: "AI descriptions", desc: "Generate mouth-watering copy with a single click." },
    ],
  },
  {
    title: "QR & Ordering",
    items: [
      { icon: QrCode, title: "Dynamic QR codes", desc: "Restaurant-level + table-level QRs. Download instantly." },
      { icon: WhatsappLogo, title: "WhatsApp checkout", desc: "Cart pushes a formatted order right to your WhatsApp." },
      { icon: Notepad, title: "Order log", desc: "Every order captured and searchable in your dashboard." },
      { icon: DeviceMobile, title: "Mobile-first PWA", desc: "Blazing fast for customers on any device." },
    ],
  },
  {
    title: "Growth & Insights",
    items: [
      { icon: ChartLineUp, title: "Scan analytics", desc: "See how many scans, when, and from which table." },
      { icon: Palette, title: "Themed menus", desc: "Warm & appetizing, or dark cyber — your brand." },
      { icon: Users, title: "Multi-role SaaS", desc: "Super admin oversight + restaurant owner dashboards." },
      { icon: GlobeStand, title: "SEO-ready pages", desc: "Menu pages that Google can find and rank." },
    ],
  },
];

export default function Features() {
  return (
    <div className="cyber-bg cyber-noise min-h-screen">
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <PublicNav />
      <section className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-32">
        <div className="max-w-2xl mb-20">
          <div className="overline mb-4 text-cyan-300">Features</div>
          <h1 className="font-display font-bold text-5xl lg:text-6xl text-white tracking-tight leading-tight">
            A modern operating system for your menu.
          </h1>
        </div>

        {groups.map((g, gi) => (
          <div key={g.title} className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <span className="mono text-cyan-400 text-sm">0{gi + 1}</span>
              <h2 className="font-display font-semibold text-2xl text-white tracking-tight">{g.title}</h2>
              <span className="flex-1 h-px bg-white/10" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {g.items.map((it) => (
                <div key={it.title} className="cyber-card p-6" data-testid={`feature-card-${it.title.toLowerCase().replace(/\s+/g,'-')}`}>
                  <div className="w-10 h-10 rounded-md bg-white/5 border border-white/10 grid place-items-center mb-5 text-cyan-300">
                    <it.icon size={20} weight="duotone" />
                  </div>
                  <div className="font-display font-semibold text-white">{it.title}</div>
                  <p className="text-sm text-white/60 mt-2 leading-relaxed">{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

import React from "react";
import PublicNav from "../components/layout/PublicNav";
import {
  QrCode, Storefront, WhatsappLogo, ChartLineUp, Palette, DeviceMobile,
  Sparkle, Users, Camera, GlobeStand, ForkKnife, Notepad, Tag, Receipt,
  Star, Bell, ShieldCheck, MapPin, Clock
} from "@phosphor-icons/react";

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
      { icon: Notepad, title: "Order log & statuses", desc: "Every order captured with pending → preparing → ready flow." },
      { icon: DeviceMobile, title: "Mobile-first PWA", desc: "Blazing fast for customers on any device." },
    ],
  },
  {
    title: "Growth & Insights",
    items: [
      { icon: ChartLineUp, title: "Scan analytics", desc: "See how many scans, when, and from which table." },
      { icon: Star, title: "Customer reviews", desc: "Collect star ratings and reviews on your menu page." },
      { icon: Tag, title: "Coupons & offers", desc: "Percentage or flat discount codes redeemable at checkout." },
      { icon: Receipt, title: "GST & delivery", desc: "Add tax, service charge or delivery fee automatically." },
    ],
  },
  {
    title: "Branding & Trust",
    items: [
      { icon: Palette, title: "Themed menus", desc: "Warm & appetizing or dark cyber — your brand, your palette." },
      { icon: Users, title: "Multi-role SaaS", desc: "Super admin oversight + restaurant owner dashboards." },
      { icon: Bell, title: "Offer banners", desc: "Promote seasonal specials with a scrollable top banner." },
      { icon: Clock, title: "Business hours", desc: "Auto-close orders outside opening hours." },
    ],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <PublicNav />
      <section className="container-editorial pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-3xl mb-20">
          <div className="overline mb-4">Features</div>
          <h1 className="display font-semibold text-5xl lg:text-7xl text-ink-900 leading-[0.98]">
            A modern operating system<br />for your <span className="serif-italic text-clay-600">menu.</span>
          </h1>
        </div>

        {groups.map((g, gi) => (
          <div key={g.title} className="mb-20">
            <div className="flex items-baseline gap-5 mb-8">
              <span className="mono text-clay-600 text-sm">0{gi + 1}</span>
              <h2 className="display font-semibold text-3xl text-ink-900">{g.title}</h2>
              <span className="flex-1 h-px bg-ink-200" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {g.items.map((it) => (
                <div key={it.title} className="card-editorial p-6" data-testid={`feature-card-${it.title.toLowerCase().replace(/\s+/g,'-')}`}>
                  <div className="w-10 h-10 rounded-lg bg-clay-50 grid place-items-center mb-5 text-clay-600">
                    <it.icon size={20} weight="regular" />
                  </div>
                  <div className="display font-semibold text-lg text-ink-900">{it.title}</div>
                  <p className="text-sm text-ink-600 mt-2 leading-relaxed">{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, formatApiError, BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import {
  MagnifyingGlass, WhatsappLogo, X, Plus, Minus, MapPin, Phone, Clock, Fire, ForkKnife,
  ShareNetwork, ImageSquare, Star, Tag, Megaphone, InstagramLogo, FacebookLogo,
  ArrowUp, Sparkle, CaretRight, Heart, Translate
} from "@phosphor-icons/react";

const ORDER_TYPES = [
  { id: "dine_in", label: "Dine-in", key: "accept_dine_in" },
  { id: "takeaway", label: "Takeaway", key: "accept_takeaway" },
  { id: "delivery", label: "Delivery", key: "accept_delivery" },
];

const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
];

export default function PublicMenu() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const table = sp.get("table") || "";
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [quickView, setQuickView] = useState(null);
  const [showTop, setShowTop] = useState(false);
  const [lang, setLang] = useState("en");
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState(false);
  const scrollRefs = useRef({});

  useEffect(() => {
    api.get(`/public/restaurant/${slug}`, { params: table ? { table } : {} })
      .then((r) => setData(r.data)).catch(() => setData({ error: true }));
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug, table]);

  // Load / apply translation when language changes
  useEffect(() => {
    if (!data || data.error) return;
    if (lang === "en") { setTranslations({}); return; }
    if (translations[lang]) return; // already loaded
    setTranslating(true);
    api.get(`/public/translate-menu/${slug}`, { params: { lang } })
      .then((r) => {
        setTranslations((prev) => ({ ...prev, [lang]: r.data.translations }));
        toast.success("Menu translated");
      })
      .catch(() => toast.error("Translation unavailable"))
      .finally(() => setTranslating(false));
  }, [lang, data, slug]);

  // Helper to get translated string
  const t = (key, id, field, fallback) => {
    if (lang === "en") return fallback;
    const tr = translations[lang];
    if (!tr) return fallback;
    if (key === "tagline") return tr.tagline || fallback;
    if (key === "about") return tr.about_us || fallback;
    if (key === "category") return (tr.categories || {})[id] || fallback;
    if (key === "item") return ((tr.items || {})[id] || {})[field] || fallback;
    return fallback;
  };

  const grouped = useMemo(() => {
    if (!data?.items) return [];
    const search = q.trim().toLowerCase();
    return data.categories.map((c) => ({
      ...c,
      _tname: t("category", c.category_id, null, c.name),
      items: data.items.filter((i) =>
        i.category_id === c.category_id && i.available &&
        (!search || i.name.toLowerCase().includes(search) || (i.description||"").toLowerCase().includes(search))
      ),
    })).filter((c) => c.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, lang, translations]);

  const bestsellers = useMemo(() => (data?.items || []).filter((i) => i.bestseller && i.available).slice(0, 6), [data]);

  const addToCart = (item) => {
    setCart((c) => {
      const existing = c.find((x) => x.item_id === item.item_id);
      if (existing) return c.map((x) => x.item_id === item.item_id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { item_id: item.item_id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast.success(`${item.name} added`, { duration: 1200 });
  };
  const updateQty = (id, delta) => setCart((c) => c.map((x) => x.item_id === id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x).filter((x) => x.quantity > 0));
  const cartTotal = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const cartCount = cart.reduce((s, x) => s + x.quantity, 0);
  const scrollToCat = (id) => scrollRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!data) return <div className="min-h-screen bg-ink-50 grid place-items-center"><div className="w-10 h-10 border-2 border-clay-200 border-t-clay-600 rounded-full animate-spin" /></div>;
  if (data.error) return <div className="min-h-screen bg-ink-50 grid place-items-center p-8 text-center"><div><div className="text-2xl display font-semibold text-ink-900 mb-2">Restaurant not found</div><div className="text-ink-600">This menu link is invalid or the restaurant is no longer active.</div></div></div>;

  const r = data.restaurant;
  const rev = data.reviews_summary || { average: 0, count: 0 };
  const currency = r.currency || "$";

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: r.name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    } catch (err) {
      // User dismissal of navigator.share is expected — only log unexpected errors
      if (err?.name !== "AbortError") console.error("Share failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900 pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Offer banner */}
      {r.offer_banner_active && r.offer_banner && (
        <div className="bg-ink-900 text-ink-50 py-2.5 px-4 text-center text-sm flex items-center justify-center gap-2" data-testid="offer-banner">
          <Megaphone size={14} weight="fill" className="text-clay-400" /> <span>{r.offer_banner}</span>
        </div>
      )}

      {/* Hero */}
      <header className="relative">
        <div className="relative h-[340px] sm:h-[420px] overflow-hidden bg-ink-900">
          {r.banner_url ? (
            <img src={`${BACKEND_URL}${r.banner_url}`} className="absolute inset-0 w-full h-full object-cover" alt="" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #431407 0%, #7c2d12 50%, #431407 100%)" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/70 to-ink-900/20" />
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={share} data-testid="menu-share" className="w-10 h-10 rounded-full bg-white/95 backdrop-blur grid place-items-center text-ink-900 shadow-lg">
              <ShareNetwork size={18} weight="bold" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 container-editorial">
            <div className="flex items-end gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/95 backdrop-blur shadow-xl overflow-hidden grid place-items-center flex-shrink-0 border border-white/50">
                {r.logo_url ? <img src={`${BACKEND_URL}${r.logo_url}`} className="w-full h-full object-cover" alt="" /> :
                  <div className="text-3xl display font-bold text-clay-600">{r.name.slice(0,1)}</div>}
              </div>
              <div className="pb-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {r.is_open ? (
                    <span className="pill bg-moss-500/25 text-moss-50 border border-moss-500/40 backdrop-blur"><span className="w-1.5 h-1.5 rounded-full bg-moss-400 animate-pulse mr-1" /> Open now</span>
                  ) : (
                    <span className="pill bg-red-500/25 text-red-50 border border-red-500/40 backdrop-blur">Closed</span>
                  )}
                  {rev.count > 0 && (
                    <button onClick={()=>setShowReviews(true)} data-testid="show-reviews" className="pill bg-white/15 text-white border border-white/25 backdrop-blur flex items-center gap-1 hover:bg-white/25">
                      <Star size={11} weight="fill" className="text-clay-300" /> {rev.average} · {rev.count}
                    </button>
                  )}
                  {table && <span className="pill bg-clay-500/30 text-clay-50 border border-clay-400/40 backdrop-blur">Table {table}</span>}
                </div>
                <h1 className="display font-semibold text-4xl sm:text-6xl text-white leading-none tracking-tight">
                  {r.name}
                </h1>
                {r.tagline && <div className="text-white/90 text-sm sm:text-base mt-2 serif-italic display">{t("tagline", null, null, r.tagline)}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div className="container-editorial -mt-6 relative z-10">
          <div className="bg-white border border-ink-200 rounded-2xl shadow-lg px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            {r.business_hours && <div className="flex items-center gap-2 text-ink-700"><Clock size={15} weight="regular" className="text-clay-600" /> {r.business_hours}</div>}
            {r.address && <a href={r.google_map || "#"} target={r.google_map ? "_blank" : ""} rel="noreferrer" className="flex items-center gap-2 text-ink-700 hover:text-clay-600"><MapPin size={15} weight="regular" className="text-clay-600" /> {r.address}</a>}
            {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-2 text-ink-700 hover:text-clay-600"><Phone size={15} weight="regular" className="text-clay-600" /> {r.phone}</a>}
            {(r.gallery || []).length > 0 && <button onClick={()=>setShowGallery(true)} data-testid="show-gallery" className="flex items-center gap-2 text-ink-700 hover:text-clay-600"><ImageSquare size={15} weight="regular" className="text-clay-600" /> Gallery ({r.gallery.length})</button>}
            <div className="ml-auto flex items-center gap-1 pl-4 border-l border-ink-200">
              <Translate size={14} className="text-ink-500" />
              {LANGS.map((l) => (
                <button key={l.code} onClick={()=>setLang(l.code)} data-testid={`lang-${l.code}`} disabled={translating && lang !== l.code} className={`px-2 py-1 rounded-md text-xs font-medium ${lang === l.code ? "bg-ink-900 text-white" : "text-ink-600 hover:text-ink-900"}`}>{l.label}</button>
              ))}
              {translating && <div className="w-3 h-3 border border-clay-300 border-t-clay-600 rounded-full animate-spin ml-1" />}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container-editorial pt-10 lg:pt-14">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar / sticky category nav */}
          <aside className="lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-6">
              <div className="overline mb-3">Menu</div>
              <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input value={q} onChange={(e)=>setQ(e.target.value)} data-testid="menu-search" placeholder="Search dishes…" className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-ink-200 text-sm outline-none focus:border-clay-500" />
              </div>
            </div>
            <nav className="space-y-1 mb-6">
              {grouped.map((c) => (
                <button key={c.category_id} onClick={()=>scrollToCat(c.category_id)} data-testid={`nav-cat-${c.category_id}`} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-white transition-colors">
                  <span>{c.name}</span>
                  <span className="mono text-xs text-ink-400">{c.items.length}</span>
                </button>
              ))}
            </nav>
            {r.about_us && (
              <div className="hidden lg:block bg-white border border-ink-200 rounded-2xl p-5">
                <div className="overline mb-3">About</div>
                <p className="display serif-italic text-ink-800 leading-relaxed text-lg">{t("about", null, null, r.about_us)}</p>
              </div>
            )}
          </aside>

          <div className="lg:col-span-9 space-y-14">
            {/* About mobile */}
            {r.about_us && (
              <div className="lg:hidden bg-white border border-ink-200 rounded-2xl p-5">
                <div className="overline mb-2">About</div>
                <p className="display serif-italic text-ink-800 leading-relaxed">{t("about", null, null, r.about_us)}</p>
              </div>
            )}

            {/* Chef's picks */}
            {bestsellers.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <Sparkle size={18} weight="fill" className="text-clay-600" />
                  <h2 className="display font-semibold text-2xl text-ink-900">{t("category", "__cp__", null, "Chef's picks")}</h2>
                  <span className="flex-1 h-px bg-ink-200" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bestsellers.map((it) => (
                    <button key={it.item_id} onClick={()=>setQuickView(it)} className="text-left bg-white border border-ink-200 rounded-2xl overflow-hidden hover:border-ink-400 transition-all hover:-translate-y-0.5" data-testid={`best-${it.item_id}`}>
                      <div className="aspect-[4/3] bg-clay-50 relative">
                        {it.image_url ? <img src={`${BACKEND_URL}${it.image_url}`} className="w-full h-full object-cover" alt={it.name} /> : <div className="w-full h-full grid place-items-center text-clay-300"><ImageSquare size={36} weight="regular" /></div>}
                        <div className="absolute top-2 left-2 pill bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">★ Bestseller</div>
                      </div>
                      <div className="p-4">
                        <div className="display font-semibold text-lg text-ink-900 leading-tight">{t("item", it.item_id, "name", it.name)}</div>
                        {it.description && <div className="text-sm text-ink-500 mt-1 line-clamp-2">{t("item", it.item_id, "description", it.description)}</div>}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="mono font-bold text-ink-900">{currency}{it.price}</div>
                          <span onClick={(e)=>{e.stopPropagation(); addToCart(it);}} data-testid={`best-add-${it.item_id}`} className="pill bg-clay-600 text-white hover:bg-clay-700 cursor-pointer"><Plus size={11} weight="bold" /> Add</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Categorised sections */}
            {grouped.map((c) => (
              <section key={c.category_id} ref={(el) => (scrollRefs.current[c.category_id] = el)} data-testid={`section-${c.category_id}`}>
                <div className="flex items-baseline gap-4 mb-6">
                  <h2 className="display font-semibold text-3xl text-ink-900 tracking-tight">{c._tname}</h2>
                  <span className="mono text-xs text-ink-500 mb-1">{c.items.length} items</span>
                  <span className="flex-1 h-px bg-ink-200" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {c.items.map((it) => (
                    <ItemCard key={it.item_id} it={it} currency={currency} onAdd={()=>addToCart(it)} onOpen={()=>setQuickView(it)}
                      displayName={t("item", it.item_id, "name", it.name)}
                      displayDesc={t("item", it.item_id, "description", it.description || "")}
                    />
                  ))}
                </div>
              </section>
            ))}

            {grouped.length === 0 && (
              <div className="text-center py-16 bg-white border border-ink-200 rounded-2xl">
                <ForkKnife size={40} weight="regular" className="mx-auto text-ink-300 mb-3" />
                <div className="display text-xl text-ink-900">Nothing to show</div>
                <div className="text-ink-500 text-sm mt-1">Try another search term.</div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-ink-200 bg-white">
        <div className="container-editorial py-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-clay-100 grid place-items-center display font-bold text-clay-700">{r.name.slice(0,1)}</div>
                <div className="display font-semibold text-ink-900">{r.name}</div>
              </div>
              {r.tagline && <div className="text-sm text-ink-600 serif-italic display">{r.tagline}</div>}
            </div>
            <div>
              <div className="overline mb-3">Contact</div>
              <div className="space-y-2 text-sm text-ink-700">
                {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-2 hover:text-clay-600"><Phone size={13} /> {r.phone}</a>}
                {r.whatsapp && <a href={`https://wa.me/${(r.whatsapp||"").replace(/[^0-9]/g,"")}`} className="flex items-center gap-2 hover:text-clay-600"><WhatsappLogo size={13} /> WhatsApp</a>}
                {r.address && <div className="flex items-center gap-2"><MapPin size={13} /> {r.address}</div>}
              </div>
            </div>
            <div>
              <div className="overline mb-3">Follow</div>
              <div className="flex gap-2">
                {r.social?.instagram && <a href={r.social.instagram} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg border border-ink-200 grid place-items-center hover:border-clay-500 hover:text-clay-600 text-ink-700"><InstagramLogo size={16} weight="bold" /></a>}
                {r.social?.facebook && <a href={r.social.facebook} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg border border-ink-200 grid place-items-center hover:border-clay-500 hover:text-clay-600 text-ink-700"><FacebookLogo size={16} weight="bold" /></a>}
                <button onClick={share} className="w-9 h-9 rounded-lg border border-ink-200 grid place-items-center hover:border-clay-500 hover:text-clay-600 text-ink-700" data-testid="footer-share"><ShareNetwork size={16} weight="bold" /></button>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-ink-200 flex items-center justify-between text-xs text-ink-500 flex-wrap gap-3">
            <span>© {new Date().getFullYear()} {r.name}</span>
            <a href="/" className="mono hover:text-clay-600">Powered by MenuMaker</a>
          </div>
        </div>
      </footer>

      {/* Floating cart */}
      {cartCount > 0 && (
        <button onClick={()=>setShowCart(true)} data-testid="menu-open-cart" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 bg-ink-900 text-white rounded-full pl-4 pr-6 py-3 flex items-center gap-3 shadow-2xl hover:bg-ink-800 transition-colors">
          <span className="w-8 h-8 rounded-full bg-clay-500 grid place-items-center font-bold mono text-sm">{cartCount}</span>
          <span className="font-semibold text-sm">View cart</span>
          <span className="mono text-clay-300">{currency}{cartTotal.toFixed(2)}</span>
        </button>
      )}

      {showTop && (
        <button onClick={()=>window.scrollTo({top: 0, behavior: "smooth"})} data-testid="scroll-top" className="fixed bottom-24 right-5 z-20 w-11 h-11 rounded-full bg-white border border-ink-200 shadow-lg grid place-items-center text-ink-700 hover:text-clay-600">
          <ArrowUp size={16} weight="bold" />
        </button>
      )}

      {quickView && <QuickView item={quickView} currency={currency} onClose={()=>setQuickView(null)} onAdd={()=>{ addToCart(quickView); setQuickView(null); }} />}
      {showCart && <CartDrawer cart={cart} setCart={setCart} r={r} table={table} slug={slug} onClose={()=>setShowCart(false)} updateQty={updateQty} />}
      {showReviews && <ReviewsSheet slug={slug} onClose={()=>setShowReviews(false)} />}
      {showGallery && <GallerySheet gallery={r.gallery || []} onClose={()=>setShowGallery(false)} />}
    </div>
  );
}

function ItemCard({ it, currency, onAdd, onOpen, displayName, displayDesc }) {
  return (
    <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden flex sm:flex-col hover:border-ink-400 transition-all hover:-translate-y-0.5" data-testid={`public-item-${it.item_id}`}>
      <button onClick={onOpen} className="w-28 sm:w-full h-28 sm:h-48 bg-clay-50 relative flex-shrink-0">
        {it.image_url ? <img src={`${BACKEND_URL}${it.image_url}`} className="w-full h-full object-cover" alt={displayName} /> : <div className="w-full h-full grid place-items-center text-clay-300"><ImageSquare size={30} weight="regular" /></div>}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`w-4 h-4 border-2 grid place-items-center bg-white ${it.veg ? "border-moss-600" : "border-clay-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${it.veg ? "bg-moss-600" : "bg-clay-600"}`} />
          </span>
          {it.bestseller && <span className="pill bg-amber-50 text-amber-800 border border-amber-200 text-[9px] !py-0.5">★</span>}
          {it.spicy_level > 0 && <span className="pill bg-red-50 text-red-700 border border-red-200 text-[9px] !py-0.5 flex items-center gap-0.5">{Array.from({length: it.spicy_level}).map((_,i)=><Fire key={i} size={9} weight="fill" />)}</span>}
        </div>
      </button>
      <div className="p-4 flex-1 flex flex-col">
        <button onClick={onOpen} className="text-left flex-1">
          <div className="display font-semibold text-lg text-ink-900 leading-tight">{displayName}</div>
          {displayDesc && <div className="text-sm text-ink-500 mt-1 line-clamp-2">{displayDesc}</div>}
        </button>
        <div className="mt-3 flex items-center justify-between">
          <div className="mono font-bold text-ink-900">{currency}{it.price}</div>
          <button onClick={onAdd} data-testid={`add-cart-${it.item_id}`} className="text-clay-600 border border-clay-200 hover:bg-clay-600 hover:text-white hover:border-clay-600 rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors">
            <Plus size={12} weight="bold" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickView({ item, currency, onClose, onAdd }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={(e)=>e.stopPropagation()} data-testid="quick-view">
        <div className="relative">
          <div className="aspect-video bg-clay-50">
            {item.image_url ? <img src={`${BACKEND_URL}${item.image_url}`} className="w-full h-full object-cover" alt={item.name} /> : <div className="w-full h-full grid place-items-center text-clay-300"><ImageSquare size={60} weight="regular" /></div>}
          </div>
          <button onClick={onClose} data-testid="quick-close" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur grid place-items-center"><X size={16} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-4 h-4 border-2 grid place-items-center ${item.veg ? "border-moss-600" : "border-clay-600"}`}><span className={`w-1.5 h-1.5 rounded-full ${item.veg ? "bg-moss-600" : "bg-clay-600"}`} /></span>
            {item.bestseller && <span className="pill bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">★ Bestseller</span>}
            {item.spicy_level > 0 && <span className="pill bg-red-50 text-red-700 border border-red-200 text-[10px] flex items-center gap-0.5">{Array.from({length: item.spicy_level}).map((_,i)=><Fire key={i} size={10} weight="fill" />)}</span>}
          </div>
          <h3 className="display font-semibold text-3xl text-ink-900 leading-tight">{item.name}</h3>
          {item.description && <p className="text-ink-600 mt-3 leading-relaxed">{item.description}</p>}
        </div>
        <div className="p-6 border-t border-ink-200 flex items-center justify-between">
          <div className="mono font-bold text-2xl text-ink-900">{currency}{item.price}</div>
          <button onClick={onAdd} data-testid="quick-add" className="btn-accent"><Plus size={14} weight="bold" /> Add to cart</button>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, setCart, r, table, slug, onClose, updateQty }) {
  const [customer, setCustomer] = useState({ name: "", phone: "", notes: "", address: "" });
  const [coupon, setCoupon] = useState({ code: "", applied: null });
  const [orderType, setOrderType] = useState(table ? "dine_in" : "dine_in");
  const [placing, setPlacing] = useState(false);
  const currency = r.currency || "$";
  const availableTypes = ORDER_TYPES.filter((t) => r[t.key] !== false);

  const subtotal = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const discount = coupon.applied?.discount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const gst = taxable * ((r.gst_percent || 0) / 100);
  const svc = taxable * ((r.service_charge_percent || 0) / 100);
  const delivery = orderType === "delivery" ? (r.delivery_charge || 0) : 0;
  const total = taxable + gst + svc + delivery;

  const applyCoupon = async () => {
    if (!coupon.code) return;
    try {
      const { data } = await api.get(`/public/coupons/${slug}/${coupon.code.toUpperCase()}`, { params: { subtotal } });
      setCoupon({ code: coupon.code.toUpperCase(), applied: data });
      toast.success(`${data.code} applied — you save ${currency}${data.discount}`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail, "Invalid coupon")); setCoupon({ code: "", applied: null }); }
  };

  const place = async () => {
    if (!customer.name || !customer.phone) return toast.error("Enter your name and phone");
    if (orderType === "delivery" && !customer.address) return toast.error("Enter delivery address");
    setPlacing(true);
    try {
      const { data } = await api.post("/public/orders", {
        restaurant_slug: slug, customer_name: customer.name, customer_phone: customer.phone,
        table_number: table || undefined, notes: customer.notes, items: cart,
        order_type: orderType, coupon_code: coupon.applied?.code, address: customer.address,
      });
      if (data.whatsapp_url) window.location.href = data.whatsapp_url;
      else toast.success("Order sent!");
      setCart([]); onClose();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail, "Failed")); } finally { setPlacing(false); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e)=>e.stopPropagation()} data-testid="cart-drawer">
        <div className="p-5 flex items-center justify-between border-b border-ink-200">
          <div>
            <div className="display font-semibold text-xl text-ink-900">Your order</div>
            <div className="text-xs text-ink-500 mono">{r.name}{table ? ` · Table ${table}` : ""}</div>
          </div>
          <button onClick={onClose} data-testid="cart-close" className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.map((it) => (
            <div key={it.item_id} className="flex items-center gap-3 border border-ink-100 rounded-xl p-3" data-testid={`cart-item-${it.item_id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900 text-sm truncate">{it.name}</div>
                <div className="mono text-xs text-ink-500">{currency}{it.price}</div>
              </div>
              <div className="flex items-center gap-2 bg-ink-100 rounded-full">
                <button onClick={() => updateQty(it.item_id, -1)} data-testid={`cart-dec-${it.item_id}`} className="w-8 h-8 grid place-items-center text-ink-900"><Minus size={12} weight="bold" /></button>
                <span className="mono text-sm w-4 text-center">{it.quantity}</span>
                <button onClick={() => updateQty(it.item_id, 1)} data-testid={`cart-inc-${it.item_id}`} className="w-8 h-8 grid place-items-center text-ink-900"><Plus size={12} weight="bold" /></button>
              </div>
              <div className="mono font-bold text-ink-900 text-sm w-16 text-right">{currency}{(it.price * it.quantity).toFixed(2)}</div>
            </div>
          ))}

          {!table && availableTypes.length > 1 && (
            <div>
              <div className="overline mb-2">Order type</div>
              <div className="flex gap-2">
                {availableTypes.map((t) => (
                  <button key={t.id} onClick={()=>setOrderType(t.id)} data-testid={`order-type-${t.id}`} className={`flex-1 py-2.5 rounded-lg border text-sm ${orderType === t.id ? "border-clay-600 bg-clay-50 text-clay-700 font-medium" : "border-ink-200 text-ink-600"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <input placeholder="Your name" value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})} data-testid="cart-name" className="input-field" />
            <input placeholder="Phone number" value={customer.phone} onChange={(e)=>setCustomer({...customer,phone:e.target.value})} data-testid="cart-phone" className="input-field" />
            {orderType === "delivery" && (
              <input placeholder="Delivery address" value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})} data-testid="cart-address" className="input-field" />
            )}
            <textarea placeholder="Notes (optional)" value={customer.notes} onChange={(e)=>setCustomer({...customer,notes:e.target.value})} data-testid="cart-notes" className="input-field min-h-[60px]" />
          </div>

          <div className="flex gap-2">
            <input placeholder="Coupon code" value={coupon.code} onChange={(e)=>setCoupon({...coupon, code: e.target.value.toUpperCase()})} data-testid="cart-coupon" className="input-field flex-1 mono uppercase text-sm" />
            <button onClick={applyCoupon} data-testid="cart-apply-coupon" className="btn-primary text-sm">Apply</button>
          </div>
          {coupon.applied && <div className="pill bg-moss-50 text-moss-700 border border-moss-500/30 text-xs w-fit"><Tag size={12} weight="fill" /> {coupon.applied.code} — save {currency}{coupon.applied.discount}</div>}

          <div className="pt-3 border-t border-ink-200 space-y-1.5 text-sm">
            <Row l="Subtotal" v={`${currency}${subtotal.toFixed(2)}`} />
            {discount > 0 && <Row l={`Discount (${coupon.applied.code})`} v={`-${currency}${discount.toFixed(2)}`} negative />}
            {gst > 0 && <Row l={`GST (${r.gst_percent}%)`} v={`${currency}${gst.toFixed(2)}`} />}
            {svc > 0 && <Row l={`Service (${r.service_charge_percent}%)`} v={`${currency}${svc.toFixed(2)}`} />}
            {delivery > 0 && <Row l="Delivery" v={`${currency}${delivery.toFixed(2)}`} />}
          </div>
        </div>
        <div className="p-5 border-t border-ink-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-ink-600 text-sm">Total</span>
            <span className="mono font-bold text-2xl text-ink-900">{currency}{total.toFixed(2)}</span>
          </div>
          <button onClick={place} disabled={placing || cart.length === 0} data-testid="cart-place-order" className="btn-accent w-full disabled:opacity-60">
            <WhatsappLogo size={18} weight="fill" /> {placing ? "Sending..." : "Order via WhatsApp"}
          </button>
          <ReviewButton slug={slug} />
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, negative }) {
  return <div className="flex justify-between"><span className="text-ink-500">{l}</span><span className={`mono ${negative ? "text-moss-700" : "text-ink-900"}`}>{v}</span></div>;
}

function ReviewButton({ slug }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ customer_name: "", rating: 5, comment: "" });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/public/reviews", { restaurant_slug: slug, ...form }); toast.success("Thanks for your review!"); setShow(false); }
    catch { toast.error("Could not submit review"); }
  };
  return (
    <>
      <button onClick={()=>setShow(true)} className="mt-3 w-full text-center text-sm text-ink-600 hover:text-clay-600" data-testid="cart-review-btn">Leave a review →</button>
      {show && (
        <div className="fixed inset-0 z-[60] bg-ink-900/50 grid place-items-center p-4" onClick={()=>setShow(false)}>
          <form onSubmit={submit} onClick={(e)=>e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="display font-semibold text-xl text-ink-900 mb-4">How was it?</div>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={()=>setForm({...form, rating: n})} data-testid={`rating-${n}`}>
                  <Star size={28} weight={n <= form.rating ? "fill" : "regular"} className="text-clay-500" />
                </button>
              ))}
            </div>
            <input required placeholder="Your name" value={form.customer_name} onChange={(e)=>setForm({...form, customer_name: e.target.value})} className="input-field mb-3" data-testid="review-name" />
            <textarea placeholder="Comment (optional)" value={form.comment} onChange={(e)=>setForm({...form, comment: e.target.value})} className="input-field min-h-[80px] mb-4" data-testid="review-comment" />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={()=>setShow(false)} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" className="btn-accent text-sm" data-testid="review-submit">Submit</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function ReviewsSheet({ slug, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/public/reviews/${slug}`).then((r) => setData(r.data)); }, [slug]);
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e)=>e.stopPropagation()} data-testid="reviews-sheet">
        <div className="p-5 flex items-center justify-between border-b border-ink-200">
          <div className="display font-semibold text-xl text-ink-900">Reviews {data && `· ${data.average}★`}</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center"><X size={16} /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!data ? <div className="text-center text-ink-500 py-10">Loading…</div> : data.reviews.length === 0 ? (
            <div className="text-center py-10">
              <Star size={40} weight="regular" className="mx-auto text-ink-300 mb-3" />
              <div className="display text-ink-900">No reviews yet</div>
              <div className="text-ink-500 text-sm mt-1">Be the first to review!</div>
            </div>
          ) : data.reviews.map((r) => (
            <div key={r.review_id} className="border border-ink-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-ink-900">{r.customer_name}</div>
                <div className="flex gap-0.5">
                  {Array.from({length:5}).map((_,i) => <Star key={i} size={12} weight={i < r.rating ? "fill" : "regular"} className="text-clay-500" />)}
                </div>
              </div>
              {r.comment && <p className="text-ink-700 text-sm mt-2">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GallerySheet({ gallery, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e)=>e.stopPropagation()} data-testid="gallery-sheet">
        <div className="p-5 flex items-center justify-between border-b border-ink-200">
          <div className="display font-semibold text-xl text-ink-900">Gallery</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center"><X size={16} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto">
          {gallery.map((g, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-ink-100">
              <img src={`${BACKEND_URL}${g}`} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

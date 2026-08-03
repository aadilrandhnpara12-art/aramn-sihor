import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, formatApiError, BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import { MagnifyingGlass, ShoppingCartSimple, WhatsappLogo, X, Plus, Minus, MapPin, Phone, Clock, Fire, ForkKnife, ShareNetwork, ImageSquare } from "@phosphor-icons/react";

export default function PublicMenu() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const table = sp.get("table") || "";
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    api.get(`/public/restaurant/${slug}`, { params: table ? { table } : {} })
      .then((r) => { setData(r.data); if (r.data.categories?.[0]) setActiveCat(r.data.categories[0].category_id); })
      .catch(() => setData({ error: true }));
  }, [slug, table]);

  const items = useMemo(() => {
    if (!data?.items) return [];
    let out = data.items.filter((i) => i.available);
    if (activeCat) out = out.filter((i) => i.category_id === activeCat);
    if (q) {
      const qq = q.toLowerCase();
      out = out.filter((i) => i.name.toLowerCase().includes(qq) || (i.description||"").toLowerCase().includes(qq));
    }
    return out;
  }, [data, activeCat, q]);

  const addToCart = (item) => {
    setCart((c) => {
      const existing = c.find((x) => x.item_id === item.item_id);
      if (existing) return c.map((x) => x.item_id === item.item_id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { item_id: item.item_id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast.success(`Added ${item.name}`, { duration: 1200 });
  };
  const updateQty = (id, delta) => {
    setCart((c) => c.map((x) => x.item_id === id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x).filter((x) => x.quantity > 0));
  };
  const cartTotal = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const cartCount = cart.reduce((s, x) => s + x.quantity, 0);

  if (!data) return <div className="warm-bg min-h-screen grid place-items-center"><div className="w-10 h-10 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (data.error) return <div className="warm-bg min-h-screen grid place-items-center p-8 text-center"><div><div className="text-2xl menu-serif font-bold text-warm-ink mb-2">Restaurant not found</div><div className="text-warm-ink/60">This menu link is invalid or the restaurant is no longer active.</div></div></div>;

  const r = data.restaurant;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: r.name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
    } catch {}
  };

  return (
    <div className="warm-bg min-h-screen pb-32" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Banner */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 overflow-hidden">
        {r.banner_url && <img src={`${BACKEND_URL}${r.banner_url}`} className="absolute inset-0 w-full h-full object-cover" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <button onClick={share} data-testid="menu-share" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur grid place-items-center text-warm-ink shadow-lg">
          <ShareNetwork size={18} weight="bold" />
        </button>
      </div>

      {/* Restaurant header */}
      <div className="max-w-3xl mx-auto px-5 -mt-14 relative">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 rounded-2xl bg-white shadow-xl overflow-hidden grid place-items-center flex-shrink-0 border border-orange-100">
            {r.logo_url ? <img src={`${BACKEND_URL}${r.logo_url}`} className="w-full h-full object-cover" alt="" /> :
              <div className="text-3xl menu-serif font-bold text-orange-500">{r.name.slice(0,1)}</div>}
          </div>
          <div className="pb-2 min-w-0 flex-1">
            <h1 className="menu-serif font-bold text-3xl text-white drop-shadow-lg truncate">{r.name}</h1>
            {r.tagline && <div className="text-white/90 text-sm drop-shadow">{r.tagline}</div>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {r.is_open ? (
            <span className="warm-pill bg-green-100 text-green-700 border border-green-200 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Open now</span>
          ) : (
            <span className="warm-pill bg-red-100 text-red-700 border border-red-200">Closed</span>
          )}
          {r.business_hours && <span className="warm-pill bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1"><Clock size={12} weight="bold" /> {r.business_hours}</span>}
          {table && <span className="warm-pill bg-orange-100 text-orange-700 border border-orange-200">Table {table}</span>}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-warm-ink/70">
          {r.address && <a href={r.google_map || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-orange-600"><MapPin size={14} weight="bold" /> {r.address}</a>}
          {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:text-orange-600"><Phone size={14} weight="bold" /> {r.phone}</a>}
        </div>

        {/* Search */}
        <div className="mt-6 relative">
          <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-ink/40" />
          <input
            value={q} onChange={(e)=>setQ(e.target.value)}
            data-testid="menu-search"
            placeholder="Search food, drinks, desserts…"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-stone-200 focus:border-orange-400 outline-none text-warm-ink placeholder-warm-ink/40"
          />
        </div>

        {/* Category strip */}
        <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2 sticky top-0 warm-bg z-10 pt-2">
          {data.categories.map((c) => (
            <button key={c.category_id} onClick={()=>setActiveCat(c.category_id)} data-testid={`menu-cat-${c.category_id}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                activeCat === c.category_id ? "bg-warm-ink text-white border-warm-ink" : "bg-white text-warm-ink/70 border-stone-200 hover:border-stone-300"
              }`}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="mt-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ForkKnife size={40} weight="duotone" className="mx-auto text-warm-ink/30 mb-3" />
              <div className="menu-serif text-xl text-warm-ink">Nothing here yet</div>
              <div className="text-warm-ink/50 text-sm mt-1">Try another category or search term.</div>
            </div>
          ) : items.map((it) => (
            <div key={it.item_id} data-testid={`public-item-${it.item_id}`} className="warm-card p-4 flex gap-4 items-center hover:shadow-md transition-shadow">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 grid place-items-center">
                {it.image_url ? <img src={`${BACKEND_URL}${it.image_url}`} alt={it.name} className="w-full h-full object-cover" /> : <ImageSquare size={26} weight="duotone" className="text-stone-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`w-3 h-3 border-2 grid place-items-center ${it.veg ? "border-green-600" : "border-red-600"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${it.veg ? "bg-green-600" : "bg-red-600"}`} />
                  </span>
                  {it.bestseller && <span className="warm-pill bg-yellow-100 text-yellow-800 border border-yellow-200 text-[10px]">★ Bestseller</span>}
                  {it.spicy_level > 0 && <span className="text-xs text-orange-500 flex items-center gap-0.5">{Array.from({length: it.spicy_level}).map((_,i)=><Fire key={i} size={11} weight="fill" />)}</span>}
                </div>
                <div className="menu-serif font-semibold text-lg text-warm-ink leading-tight">{it.name}</div>
                {it.description && <div className="text-sm text-warm-ink/60 mt-1 line-clamp-2">{it.description}</div>}
                <div className="mt-2 flex items-center justify-between">
                  <div className="mono font-bold text-warm-ink">{r.currency}{it.price}</div>
                  <button onClick={() => addToCart(it)} data-testid={`add-cart-${it.item_id}`} className="text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-full px-4 py-1.5 text-sm font-semibold flex items-center gap-1">
                    <Plus size={14} weight="bold" /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <button onClick={()=>setShowCart(true)} data-testid="menu-open-cart" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 bg-warm-ink text-white rounded-full pl-4 pr-6 py-3 flex items-center gap-3 shadow-2xl">
          <span className="w-8 h-8 rounded-full bg-orange-500 grid place-items-center font-bold mono text-sm">{cartCount}</span>
          <span className="font-semibold">View cart</span>
          <span className="mono text-orange-300">{r.currency}{cartTotal.toFixed(2)}</span>
        </button>
      )}

      {showCart && <CartDrawer cart={cart} setCart={setCart} r={r} table={table} slug={slug} onClose={()=>setShowCart(false)} updateQty={updateQty} />}
    </div>
  );
}

function CartDrawer({ cart, setCart, r, table, slug, onClose, updateQty }) {
  const total = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const [customer, setCustomer] = useState({ name: "", phone: "", notes: "" });
  const [placing, setPlacing] = useState(false);

  const place = async () => {
    if (!customer.name || !customer.phone) return toast.error("Enter your name and phone");
    setPlacing(true);
    try {
      const { data } = await api.post("/public/orders", {
        restaurant_slug: slug,
        customer_name: customer.name,
        customer_phone: customer.phone,
        table_number: table || undefined,
        notes: customer.notes,
        items: cart,
      });
      if (data.whatsapp_url) {
        window.location.href = data.whatsapp_url;
      } else {
        toast.success("Order sent! We'll be in touch.");
      }
      setCart([]);
      onClose();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail, "Failed"));
    } finally { setPlacing(false); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e)=>e.stopPropagation()} data-testid="cart-drawer">
        <div className="p-5 flex items-center justify-between border-b border-stone-100">
          <div>
            <div className="menu-serif font-bold text-xl text-warm-ink">Your order</div>
            <div className="text-xs text-warm-ink/50 mono">{r.name}{table ? ` · Table ${table}` : ""}</div>
          </div>
          <button onClick={onClose} data-testid="cart-close" className="w-9 h-9 rounded-full bg-stone-100 grid place-items-center"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.map((it) => (
            <div key={it.item_id} className="flex items-center gap-3 border border-stone-100 rounded-xl p-3" data-testid={`cart-item-${it.item_id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-warm-ink text-sm truncate">{it.name}</div>
                <div className="mono text-xs text-warm-ink/50">{r.currency}{it.price}</div>
              </div>
              <div className="flex items-center gap-2 bg-stone-100 rounded-full">
                <button onClick={() => updateQty(it.item_id, -1)} data-testid={`cart-dec-${it.item_id}`} className="w-8 h-8 grid place-items-center text-warm-ink"><Minus size={12} weight="bold" /></button>
                <span className="mono text-sm w-4 text-center">{it.quantity}</span>
                <button onClick={() => updateQty(it.item_id, 1)} data-testid={`cart-inc-${it.item_id}`} className="w-8 h-8 grid place-items-center text-warm-ink"><Plus size={12} weight="bold" /></button>
              </div>
              <div className="mono font-bold text-warm-ink text-sm w-16 text-right">{r.currency}{(it.price * it.quantity).toFixed(2)}</div>
            </div>
          ))}

          <div className="pt-4 space-y-3">
            <input placeholder="Your name" value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})} data-testid="cart-name" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:border-orange-400" />
            <input placeholder="Phone number" value={customer.phone} onChange={(e)=>setCustomer({...customer,phone:e.target.value})} data-testid="cart-phone" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:border-orange-400" />
            <textarea placeholder="Notes (optional)" value={customer.notes} onChange={(e)=>setCustomer({...customer,notes:e.target.value})} data-testid="cart-notes" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:border-orange-400 min-h-[70px]" />
          </div>
        </div>
        <div className="p-5 border-t border-stone-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-warm-ink/60 text-sm">Total</span>
            <span className="mono font-bold text-2xl text-warm-ink">{r.currency}{total.toFixed(2)}</span>
          </div>
          <button onClick={place} disabled={placing || cart.length === 0} data-testid="cart-place-order" className="w-full warm-btn disabled:opacity-60">
            <WhatsappLogo size={18} weight="fill" /> {placing ? "Sending..." : "Order via WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

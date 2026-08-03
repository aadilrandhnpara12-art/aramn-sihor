import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, formatApiError, BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import {
  MagnifyingGlass, WhatsappLogo, X, Plus, Minus, MapPin, Phone, Clock, Fire, ForkKnife,
  ShareNetwork, ImageSquare, Star, Tag, Megaphone, House, CaretDown
} from "@phosphor-icons/react";

const ORDER_TYPES = [
  { id: "dine_in", label: "Dine-in", key: "accept_dine_in" },
  { id: "takeaway", label: "Takeaway", key: "accept_takeaway" },
  { id: "delivery", label: "Delivery", key: "accept_delivery" },
];

export default function PublicMenu() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const table = sp.get("table") || "";
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

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
  const updateQty = (id, delta) => setCart((c) => c.map((x) => x.item_id === id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x).filter((x) => x.quantity > 0));
  const cartTotal = cart.reduce((s, x) => s + x.price * x.quantity, 0);
  const cartCount = cart.reduce((s, x) => s + x.quantity, 0);

  if (!data) return <div className="warm-bg min-h-screen grid place-items-center"><div className="w-10 h-10 border-2 border-clay-200 border-t-clay-600 rounded-full animate-spin" /></div>;
  if (data.error) return <div className="warm-bg min-h-screen grid place-items-center p-8 text-center"><div><div className="text-2xl menu-serif font-bold text-ink-900 mb-2">Restaurant not found</div><div className="text-ink-600">This menu link is invalid or the restaurant is no longer active.</div></div></div>;

  const r = data.restaurant;
  const rev = data.reviews_summary || { average: 0, count: 0 };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: r.name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    } catch {}
  };

  return (
    <div className="warm-bg min-h-screen pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Offer Banner */}
      {r.offer_banner_active && r.offer_banner && (
        <div className="bg-ink-900 text-ink-50 py-2.5 px-4 text-center text-sm flex items-center justify-center gap-2 sticky top-0 z-20" data-testid="offer-banner">
          <Megaphone size={14} weight="fill" className="text-clay-400" /> <span>{r.offer_banner}</span>
        </div>
      )}

      {/* Banner */}
      <div className="relative h-56 sm:h-72 overflow-hidden" style={{ background: "linear-gradient(135deg, #431407 0%, #7c2d12 50%, #431407 100%)" }}>
        {r.banner_url && <img src={`${BACKEND_URL}${r.banner_url}`} className="absolute inset-0 w-full h-full object-cover" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <button onClick={share} data-testid="menu-share" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur grid place-items-center text-ink-900 shadow-lg">
          <ShareNetwork size={18} weight="bold" />
        </button>
      </div>

      {/* Header */}
      <div className="max-w-3xl mx-auto px-5 -mt-14 relative">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 rounded-2xl bg-white shadow-xl overflow-hidden grid place-items-center flex-shrink-0 border border-clay-100">
            {r.logo_url ? <img src={`${BACKEND_URL}${r.logo_url}`} className="w-full h-full object-cover" alt="" /> :
              <div className="text-3xl menu-serif font-bold text-clay-600">{r.name.slice(0,1)}</div>}
          </div>
          <div className="pb-2 min-w-0 flex-1">
            <h1 className="menu-serif font-bold text-3xl text-white truncate" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{r.name}</h1>
            {r.tagline && <div className="text-white/95 text-sm" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{r.tagline}</div>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 items-center">
          {r.is_open ? (
            <span className="warm-pill bg-moss-100 text-moss-700 border border-moss-500/30 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-moss-500 animate-pulse" /> Open now</span>
          ) : (
            <span className="warm-pill bg-red-100 text-red-700 border border-red-200">Closed</span>
          )}
          {r.business_hours && <span className="warm-pill bg-ink-100 text-ink-700 border border-ink-200 flex items-center gap-1"><Clock size={12} weight="bold" /> {r.business_hours}</span>}
          {table && <span className="warm-pill bg-clay-100 text-clay-700 border border-clay-200">Table {table}</span>}
          {rev.count > 0 && (
            <button onClick={()=>setShowReviews(true)} className="warm-pill bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1" data-testid="show-reviews">
              <Star size={11} weight="fill" /> {rev.average} · {rev.count} review{rev.count !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink-700">
          {r.address && <a href={r.google_map || "#"} target={r.google_map ? "_blank" : ""} rel="noreferrer" className="flex items-center gap-1.5 hover:text-clay-600"><MapPin size={14} weight="bold" /> {r.address}</a>}
          {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:text-clay-600"><Phone size={14} weight="bold" /> {r.phone}</a>}
          {(r.gallery || []).length > 0 && <button onClick={()=>setShowGallery(true)} className="flex items-center gap-1.5 hover:text-clay-600" data-testid="show-gallery"><ImageSquare size={14} weight="bold" /> Gallery ({r.gallery.length})</button>}
        </div>

        {r.about_us && (
          <div className="mt-6 p-5 warm-card">
            <div className="text-xs uppercase tracking-widest text-ink-500 mb-2">About us</div>
            <p className="menu-serif text-lg text-ink-900 leading-relaxed">{r.about_us}</p>
          </div>
        )}

        {/* Search */}
        <div className="mt-6 relative">
          <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q} onChange={(e)=>setQ(e.target.value)}
            data-testid="menu-search"
            placeholder="Search food, drinks, desserts…"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-clay-100 focus:border-clay-500 outline-none text-ink-900 placeholder-ink-400"
          />
        </div>

        {/* Category strip */}
        <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2 sticky top-0 warm-bg z-10 pt-2">
          {data.categories.map((c) => (
            <button key={c.category_id} onClick={()=>setActiveCat(c.category_id)} data-testid={`menu-cat-${c.category_id}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                activeCat === c.category_id ? "bg-ink-900 text-white border-ink-900" : "bg-white text-ink-700 border-ink-200 hover:border-ink-400"
              }`}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="mt-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ForkKnife size={40} weight="regular" className="mx-auto text-ink-300 mb-3" />
              <div className="menu-serif text-xl text-ink-900">Nothing here yet</div>
              <div className="text-ink-500 text-sm mt-1">Try another category or search term.</div>
            </div>
          ) : items.map((it) => (
            <div key={it.item_id} data-testid={`public-item-${it.item_id}`} className="warm-card p-4 flex gap-4 items-center hover:shadow-md transition-shadow">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-ink-100 overflow-hidden flex-shrink-0 grid place-items-center">
                {it.image_url ? <img src={`${BACKEND_URL}${it.image_url}`} alt={it.name} className="w-full h-full object-cover" /> : <ImageSquare size={26} weight="regular" className="text-ink-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`w-3 h-3 border-2 grid place-items-center ${it.veg ? "border-moss-600" : "border-red-600"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${it.veg ? "bg-moss-600" : "bg-red-600"}`} />
                  </span>
                  {it.bestseller && <span className="warm-pill bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">★ Bestseller</span>}
                  {it.spicy_level > 0 && <span className="text-xs text-clay-500 flex items-center gap-0.5">{Array.from({length: it.spicy_level}).map((_,i)=><Fire key={i} size={11} weight="fill" />)}</span>}
                </div>
                <div className="menu-serif font-semibold text-lg text-ink-900 leading-tight">{it.name}</div>
                {it.description && <div className="text-sm text-ink-600 mt-1 line-clamp-2">{it.description}</div>}
                <div className="mt-2 flex items-center justify-between">
                  <div className="mono font-bold text-ink-900">{r.currency}{it.price}</div>
                  <button onClick={() => addToCart(it)} data-testid={`add-cart-${it.item_id}`} className="text-clay-600 border border-clay-200 hover:bg-clay-50 rounded-full px-4 py-1.5 text-sm font-semibold flex items-center gap-1">
                    <Plus size={14} weight="bold" /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cartCount > 0 && (
        <button onClick={()=>setShowCart(true)} data-testid="menu-open-cart" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 bg-ink-900 text-white rounded-full pl-4 pr-6 py-3 flex items-center gap-3 shadow-2xl">
          <span className="w-8 h-8 rounded-full bg-clay-500 grid place-items-center font-bold mono text-sm">{cartCount}</span>
          <span className="font-semibold">View cart</span>
          <span className="mono text-clay-300">{r.currency}{cartTotal.toFixed(2)}</span>
        </button>
      )}

      {showCart && <CartDrawer cart={cart} setCart={setCart} r={r} table={table} slug={slug} onClose={()=>setShowCart(false)} updateQty={updateQty} />}
      {showReviews && <ReviewsSheet slug={slug} onClose={()=>setShowReviews(false)} />}
      {showGallery && <GallerySheet gallery={r.gallery || []} onClose={()=>setShowGallery(false)} />}
    </div>
  );
}

function CartDrawer({ cart, setCart, r, table, slug, onClose, updateQty }) {
  const [customer, setCustomer] = useState({ name: "", phone: "", notes: "", address: "" });
  const [coupon, setCoupon] = useState({ code: "", applied: null });
  const [orderType, setOrderType] = useState(table ? "dine_in" : "dine_in");
  const [placing, setPlacing] = useState(false);

  const availableTypes = ORDER_TYPES.filter((t) => r[t.key] !== false && !(t.id === "dine_in" && !table && !r.accept_dine_in));

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
      toast.success(`${data.code} applied — you save ${r.currency}${data.discount}`);
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
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e)=>e.stopPropagation()} data-testid="cart-drawer">
        <div className="p-5 flex items-center justify-between border-b border-ink-200">
          <div>
            <div className="menu-serif font-bold text-xl text-ink-900">Your order</div>
            <div className="text-xs text-ink-500 mono">{r.name}{table ? ` · Table ${table}` : ""}</div>
          </div>
          <button onClick={onClose} data-testid="cart-close" className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.map((it) => (
            <div key={it.item_id} className="flex items-center gap-3 border border-ink-100 rounded-xl p-3" data-testid={`cart-item-${it.item_id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900 text-sm truncate">{it.name}</div>
                <div className="mono text-xs text-ink-500">{r.currency}{it.price}</div>
              </div>
              <div className="flex items-center gap-2 bg-ink-100 rounded-full">
                <button onClick={() => updateQty(it.item_id, -1)} data-testid={`cart-dec-${it.item_id}`} className="w-8 h-8 grid place-items-center text-ink-900"><Minus size={12} weight="bold" /></button>
                <span className="mono text-sm w-4 text-center">{it.quantity}</span>
                <button onClick={() => updateQty(it.item_id, 1)} data-testid={`cart-inc-${it.item_id}`} className="w-8 h-8 grid place-items-center text-ink-900"><Plus size={12} weight="bold" /></button>
              </div>
              <div className="mono font-bold text-ink-900 text-sm w-16 text-right">{r.currency}{(it.price * it.quantity).toFixed(2)}</div>
            </div>
          ))}

          {!table && availableTypes.length > 1 && (
            <div>
              <div className="text-xs uppercase tracking-widest text-ink-500 mb-2">Order type</div>
              <div className="flex gap-2">
                {availableTypes.map((t) => (
                  <button key={t.id} onClick={()=>setOrderType(t.id)} data-testid={`order-type-${t.id}`} className={`flex-1 py-2 rounded-lg border text-sm ${orderType === t.id ? "border-clay-500 bg-clay-50 text-clay-700" : "border-ink-200 text-ink-600"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <input placeholder="Your name" value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})} data-testid="cart-name" className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 outline-none focus:border-clay-500" />
            <input placeholder="Phone number" value={customer.phone} onChange={(e)=>setCustomer({...customer,phone:e.target.value})} data-testid="cart-phone" className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 outline-none focus:border-clay-500" />
            {orderType === "delivery" && (
              <input placeholder="Delivery address" value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})} data-testid="cart-address" className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 outline-none focus:border-clay-500" />
            )}
            <textarea placeholder="Notes (optional)" value={customer.notes} onChange={(e)=>setCustomer({...customer,notes:e.target.value})} data-testid="cart-notes" className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 outline-none focus:border-clay-500 min-h-[60px]" />
          </div>

          {/* Coupon */}
          <div className="flex gap-2">
            <input placeholder="Coupon code" value={coupon.code} onChange={(e)=>setCoupon({...coupon, code: e.target.value.toUpperCase()})} data-testid="cart-coupon" className="flex-1 px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 outline-none focus:border-clay-500 mono uppercase text-sm" />
            <button onClick={applyCoupon} data-testid="cart-apply-coupon" className="px-4 py-3 rounded-xl bg-ink-900 text-white text-sm font-semibold">Apply</button>
          </div>
          {coupon.applied && <div className="pill bg-moss-50 text-moss-700 border border-moss-200 text-xs"><Tag size={12} weight="fill" /> {coupon.applied.code} — save {r.currency}{coupon.applied.discount}</div>}

          <div className="pt-3 border-t border-ink-200 space-y-1.5 text-sm">
            <Row l="Subtotal" v={`${r.currency}${subtotal.toFixed(2)}`} />
            {discount > 0 && <Row l={`Discount (${coupon.applied.code})`} v={`-${r.currency}${discount.toFixed(2)}`} negative />}
            {gst > 0 && <Row l={`GST (${r.gst_percent}%)`} v={`${r.currency}${gst.toFixed(2)}`} />}
            {svc > 0 && <Row l={`Service (${r.service_charge_percent}%)`} v={`${r.currency}${svc.toFixed(2)}`} />}
            {delivery > 0 && <Row l="Delivery" v={`${r.currency}${delivery.toFixed(2)}`} />}
          </div>
        </div>
        <div className="p-5 border-t border-ink-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-ink-600 text-sm">Total</span>
            <span className="mono font-bold text-2xl text-ink-900">{r.currency}{total.toFixed(2)}</span>
          </div>
          <button onClick={place} disabled={placing || cart.length === 0} data-testid="cart-place-order" className="w-full warm-btn disabled:opacity-60">
            <WhatsappLogo size={18} weight="fill" /> {placing ? "Sending..." : "Order via WhatsApp"}
          </button>
          <ReviewButton slug={r.slug || ""} />
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, negative }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-500">{l}</span>
      <span className={`mono ${negative ? "text-moss-700" : "text-ink-900"}`}>{v}</span>
    </div>
  );
}

function ReviewButton({ slug }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ customer_name: "", rating: 5, comment: "" });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/public/reviews", { restaurant_slug: slug, ...form }); toast.success("Thanks for your review!"); setShow(false); }
    catch (e) { toast.error("Could not submit review"); }
  };
  return (
    <>
      <button onClick={()=>setShow(true)} className="mt-3 w-full text-center text-sm text-ink-600 hover:text-clay-600" data-testid="cart-review-btn">Leave a review →</button>
      {show && (
        <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" onClick={()=>setShow(false)}>
          <form onSubmit={submit} onClick={(e)=>e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="menu-serif font-bold text-xl text-ink-900 mb-4">How was it?</div>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={()=>setForm({...form, rating: n})} data-testid={`rating-${n}`}>
                  <Star size={28} weight={n <= form.rating ? "fill" : "regular"} className="text-clay-500" />
                </button>
              ))}
            </div>
            <input required placeholder="Your name" value={form.customer_name} onChange={(e)=>setForm({...form, customer_name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 outline-none mb-3" data-testid="review-name" />
            <textarea placeholder="Comment (optional)" value={form.comment} onChange={(e)=>setForm({...form, comment: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-ink-200 outline-none min-h-[80px] mb-4" data-testid="review-comment" />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={()=>setShow(false)} className="px-4 py-2 rounded-full text-ink-600">Cancel</button>
              <button type="submit" className="warm-btn text-sm" data-testid="review-submit">Submit review</button>
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e)=>e.stopPropagation()} data-testid="reviews-sheet">
        <div className="p-5 flex items-center justify-between border-b border-ink-200">
          <div className="menu-serif font-bold text-xl text-ink-900">Reviews {data && `· ${data.average}★`}</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center"><X size={16} /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!data ? <div className="text-center text-ink-500 py-10">Loading…</div> : data.reviews.length === 0 ? (
            <div className="text-center py-10">
              <Star size={40} weight="regular" className="mx-auto text-ink-300 mb-3" />
              <div className="menu-serif text-ink-900">No reviews yet</div>
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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl rounded-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e)=>e.stopPropagation()} data-testid="gallery-sheet">
        <div className="p-5 flex items-center justify-between border-b border-ink-200">
          <div className="menu-serif font-bold text-xl text-ink-900">Gallery</div>
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

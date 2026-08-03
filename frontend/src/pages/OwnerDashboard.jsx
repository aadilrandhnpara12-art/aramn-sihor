import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError, BACKEND_URL } from "../lib/api";
import DashNav from "../components/layout/DashNav";
import { toast } from "sonner";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  Plus, Trash, PencilSimple, Sparkle, Download, QrCode, Camera, TagChevron, Storefront,
  ForkKnife, Table, ChartLineUp, GearSix, Notepad, ImageSquare, Fire, Check, Tag, Receipt,
  Star, Megaphone, ImageSquare as GalleryIcon, X, ArrowRight, Clock, WhatsappLogo
} from "@phosphor-icons/react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const TABS = [
  { id: "menu", label: "Menu", icon: ForkKnife },
  { id: "qr", label: "QR & Tables", icon: QrCode },
  { id: "orders", label: "Orders", icon: Notepad },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "analytics", label: "Analytics", icon: ChartLineUp },
  { id: "profile", label: "Restaurant", icon: Storefront },
];

const ORDER_STATUS = [
  { id: "sent", label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "preparing", label: "Preparing", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "ready", label: "Ready", color: "bg-moss-50 text-moss-700 border-moss-200" },
  { id: "delivered", label: "Delivered", color: "bg-ink-100 text-ink-700 border-ink-200" },
  { id: "cancelled", label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
];

function StatCard({ label, value, sub }) {
  return (
    <div className="card-editorial p-6">
      <div className="overline">{label}</div>
      <div className="mt-3 display text-3xl text-ink-900 font-semibold">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("menu");
  const [restaurant, setRestaurant] = useState(null);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showAiImport, setShowAiImport] = useState(false);
  const [planStatus, setPlanStatus] = useState(null);

  useEffect(() => {
    if (user === false) nav("/login");
    if (user && user.role === "admin") nav("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, nav]);

  const load = async () => {
    try {
      const [r, c, i, t] = await Promise.all([
        api.get("/restaurant/me"),
        api.get("/categories"),
        api.get("/items"),
        api.get("/tables"),
      ]);
      setRestaurant(r.data);
      setCats(c.data);
      setItems(i.data);
      setTables(t.data);
    } catch (err) {
      console.error("Owner dashboard load failed:", err);
    }
  };

  useEffect(() => { if (user && user.user_id) load(); /* eslint-disable-next-line */ }, [user?.user_id]);

  useEffect(() => {
    if (user?.user_id) api.get("/plan/status").then((r) => setPlanStatus(r.data)).catch(()=>{});
  }, [user?.user_id]);

  useEffect(() => {
    if (!user?.user_id) return;
    if (tab === "analytics") api.get("/analytics/owner").then((r) => setAnalytics(r.data)).catch(()=>{});
    if (tab === "orders") api.get("/orders").then((r) => setOrders(r.data)).catch(()=>{});
    if (tab === "coupons") api.get("/coupons").then((r) => setCoupons(r.data)).catch(()=>{});
    if (tab === "reviews") api.get("/reviews").then((r) => setReviews(r.data)).catch(()=>{});
  }, [tab, user?.user_id]);

  if (!user || user === false || !restaurant) {
    return (
      <div className="min-h-screen bg-ink-50 grid place-items-center">
        <div className="w-12 h-12 border-2 border-clay-200 border-t-clay-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <DashNav title="Owner console" slug={restaurant.slug} />
      {planStatus && (planStatus.expired || planStatus.expiring_soon) && (
        <div className={`${planStatus.expired ? "bg-red-600" : "bg-amber-500"} text-white`} data-testid="plan-banner">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-2.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm flex items-center gap-2">
              <Sparkle size={14} weight="fill" />
              {planStatus.expired
                ? <>Your <b className="capitalize">{planStatus.plan}</b> plan has expired. Renew now to keep taking orders.</>
                : <>Your <b className="capitalize">{planStatus.plan}</b> plan expires in {planStatus.days_remaining} day{planStatus.days_remaining !== 1 ? "s" : ""}. Renew to avoid interruption.</>
              }
            </div>
            <a
              href={`https://wa.me/${planStatus.renewal_whatsapp}?text=${encodeURIComponent(`Hi MenuMaker! I want to renew my ${planStatus.plan} plan for restaurant "${restaurant.name}" (slug: ${restaurant.slug}, email: ${user.email}). Please share payment details.`)}`}
              target="_blank" rel="noreferrer"
              data-testid="plan-renew-btn"
              className="pill bg-white text-ink-900 hover:bg-ink-100 text-xs"
            >
              Renew via WhatsApp →
            </a>
          </div>
        </div>
      )}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-start justify-between flex-wrap gap-6 mb-8">
          <div>
            <div className="overline">Restaurant</div>
            <h1 className="display font-semibold text-4xl text-ink-900 mt-1">{restaurant.name}</h1>
            <div className="mt-2 text-ink-500 mono text-xs">/r/{restaurant.slug}</div>
          </div>
          <div className="flex gap-1.5 flex-wrap p-1 bg-white border border-ink-200 rounded-full">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  tab === t.id ? "bg-ink-900 text-ink-50" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                <t.icon size={13} weight="regular" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "menu" && <MenuTab cats={cats} items={items} restaurant={restaurant} reload={load} showAiImport={showAiImport} setShowAiImport={setShowAiImport} />}
        {tab === "qr" && <QRTab restaurant={restaurant} tables={tables} reload={load} />}
        {tab === "orders" && <OrdersTab orders={orders} restaurant={restaurant} reload={() => api.get("/orders").then((r) => setOrders(r.data))} />}
        {tab === "coupons" && <CouponsTab coupons={coupons} restaurant={restaurant} reload={() => api.get("/coupons").then((r) => setCoupons(r.data))} />}
        {tab === "reviews" && <ReviewsTab reviews={reviews} />}
        {tab === "analytics" && <AnalyticsTab analytics={analytics} />}
        {tab === "profile" && <ProfileTab restaurant={restaurant} reload={load} />}
      </div>
    </div>
  );
}

/* ================== MENU TAB ================== */
function MenuTab({ cats, items, restaurant, reload, showAiImport, setShowAiImport }) {
  const [showCat, setShowCat] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeCat, setActiveCat] = useState(null);

  const filtered = useMemo(() => activeCat ? items.filter((i) => i.category_id === activeCat) : items, [items, activeCat]);

  return (
    <div className="grid lg:grid-cols-12 gap-5">
      <div className="lg:col-span-3 card-editorial p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="overline">Categories</div>
          <button onClick={() => setShowCat(true)} data-testid="add-category-btn" className="w-7 h-7 rounded-md border border-ink-200 hover:border-ink-900 text-ink-700 grid place-items-center">
            <Plus size={13} weight="bold" />
          </button>
        </div>
        <div className="space-y-1">
          <button onClick={() => setActiveCat(null)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeCat === null ? "bg-ink-100 text-ink-900" : "text-ink-600 hover:bg-ink-100"}`}>
            All items <span className="mono text-xs text-ink-400 float-right">{items.length}</span>
          </button>
          {cats.map((c) => (
            <div key={c.category_id} className="group flex items-center">
              <button onClick={() => setActiveCat(c.category_id)} data-testid={`cat-${c.category_id}`} className={`flex-1 text-left px-3 py-2 rounded-md text-sm truncate ${activeCat === c.category_id ? "bg-ink-100 text-ink-900" : "text-ink-600 hover:bg-ink-100"}`}>
                {c.name}<span className="mono text-xs text-ink-400 float-right">{items.filter(i => i.category_id === c.category_id).length}</span>
              </button>
              <button onClick={async () => { if (confirm(`Delete category "${c.name}"?`)) { await api.delete(`/categories/${c.category_id}`); toast.success("Deleted"); reload(); } }} data-testid={`del-cat-${c.category_id}`} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-red-500 w-7 h-7 grid place-items-center">
                <Trash size={13} />
              </button>
            </div>
          ))}
          {cats.length === 0 && <div className="text-xs text-ink-500 px-3 py-4">No categories yet.</div>}
        </div>
      </div>

      <div className="lg:col-span-9">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="overline">Menu items</div>
            <div className="text-ink-500 text-sm">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAiImport(true)} data-testid="ai-import-btn" className="btn-ghost text-sm">
              <Sparkle size={14} weight="fill" className="text-clay-600" /> Import from photo
            </button>
            <button onClick={() => { if (cats.length === 0) return toast.error("Create a category first"); setEditItem(null); setShowItem(true); }} data-testid="add-item-btn" className="btn-accent text-sm">
              <Plus size={14} weight="bold" /> Add item
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="card-editorial p-16 text-center">
            <ForkKnife size={36} weight="regular" className="text-ink-300 mx-auto mb-4" />
            <div className="display text-xl text-ink-900">No items yet</div>
            <div className="text-ink-500 text-sm mt-1">Add your first delicious item to get started.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((it) => (
              <div key={it.item_id} className="card-editorial overflow-hidden" data-testid={`item-${it.item_id}`}>
                <div className="aspect-[16/10] bg-ink-100 relative overflow-hidden">
                  {it.image_url ? <img src={`${BACKEND_URL}${it.image_url}`} alt={it.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-ink-300"><ImageSquare size={40} weight="regular" /></div>}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className={`pill ${it.veg ? "bg-moss-50 text-moss-700" : "bg-clay-50 text-clay-700"}`}>{it.veg ? "Veg" : "Non-veg"}</span>
                    {it.bestseller && <span className="pill bg-amber-50 text-amber-700">Best</span>}
                    {it.spicy_level > 0 && <span className="pill bg-red-50 text-red-700 flex items-center gap-0.5"><Fire size={10} weight="fill" />{it.spicy_level}</span>}
                  </div>
                  {!it.available && <div className="absolute inset-0 bg-white/85 grid place-items-center text-ink-700 uppercase text-xs font-medium">Unavailable</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="display font-semibold text-ink-900 truncate">{it.name}</div>
                      <div className="text-xs text-ink-500 mt-1 line-clamp-2 min-h-[2rem]">{it.description || "No description"}</div>
                    </div>
                    <div className="mono text-clay-600 font-bold">{restaurant.currency}{it.price}</div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => { setEditItem(it); setShowItem(true); }} data-testid={`edit-item-${it.item_id}`} className="w-8 h-8 rounded-md border border-ink-200 hover:border-ink-900 text-ink-600 hover:text-ink-900 grid place-items-center">
                      <PencilSimple size={13} />
                    </button>
                    <button onClick={async () => { if (confirm(`Delete "${it.name}"?`)) { await api.delete(`/items/${it.item_id}`); toast.success("Deleted"); reload(); } }} data-testid={`del-item-${it.item_id}`} className="w-8 h-8 rounded-md border border-ink-200 hover:border-red-500 text-ink-600 hover:text-red-500 grid place-items-center">
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCat && <CategoryModal onClose={() => setShowCat(false)} onSaved={() => { setShowCat(false); reload(); }} />}
      {showItem && <ItemModal cats={cats} existing={editItem} onClose={() => setShowItem(false)} onSaved={() => { setShowItem(false); reload(); }} />}
      {showAiImport && <AIImportModal onClose={() => setShowAiImport(false)} onSaved={() => { setShowAiImport(false); reload(); }} />}
    </div>
  );
}

/* ================== AI IMPORT MODAL ================== */
function AIImportModal({ onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const fileRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const extract = async () => {
    if (!file) return toast.error("Select a photo first");
    setExtracting(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/ai/menu-from-photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (!data.items || data.items.length === 0) {
        toast.error("No items detected. Try a clearer photo.");
      } else {
        setItems(data.items.map((it, i) => ({ ...it, _id: i, _selected: true })));
        toast.success(`Detected ${data.items.length} items`);
      }
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail, "AI extraction failed")); }
    finally { setExtracting(false); }
  };

  const updateItem = (id, field, val) => setItems((arr) => arr.map((it) => it._id === id ? { ...it, [field]: val } : it));
  const removeItem = (id) => setItems((arr) => arr.filter((it) => it._id !== id));

  const saveAll = async () => {
    const selected = items.filter((it) => it._selected && it.name);
    if (selected.length === 0) return toast.error("Nothing to save");
    setSaving(true);
    try {
      // Group by category, find-or-create each, then bulk create items per category
      const byCat = {};
      for (const it of selected) {
        const cname = it.category || "General";
        (byCat[cname] = byCat[cname] || []).push(it);
      }
      let totalCreated = 0;
      for (const [cname, arr] of Object.entries(byCat)) {
        const catRes = await api.post("/categories/find-or-create", { name: cname });
        const catId = catRes.data.category_id;
        const payload = arr.map((it) => ({
          name: it.name, description: it.description || "", price: parseFloat(it.price) || 0,
          veg: !!it.veg, bestseller: !!it.bestseller, spicy_level: parseInt(it.spicy_level) || 0,
        }));
        const bulk = await api.post("/items/bulk", { category_id: catId, items: payload });
        totalCreated += bulk.data.created;
      }
      toast.success(`Saved ${totalCreated} items to your menu`);
      onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail, "Save failed")); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} size="lg">
      <div className="p-8" data-testid="ai-import-modal">
        <div className="overline mb-2 text-clay-600">AI import</div>
        <h3 className="display text-2xl font-semibold text-ink-900 mb-2">Build a menu from a photo</h3>
        <p className="text-ink-600 text-sm mb-6">Snap a picture of your paper menu or handwritten list. AI will extract items, prices and categories. Review, tweak, and save.</p>

        {items.length === 0 ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-ink-200 rounded-2xl p-8 text-center hover:border-clay-400 transition-colors">
              {preview ? (
                <div>
                  <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg" />
                  <div className="text-xs text-ink-500 mono mt-3">{file?.name}</div>
                  <button onClick={()=>fileRef.current?.click()} className="btn-ghost text-xs mt-3">Change photo</button>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-clay-50 grid place-items-center mx-auto mb-4 text-clay-600"><Camera size={22} weight="regular" /></div>
                  <div className="display font-semibold text-ink-900 text-lg mb-1">Upload a menu photo</div>
                  <div className="text-ink-500 text-sm mb-4">PNG, JPG, HEIC · up to 10MB</div>
                  <button onClick={()=>fileRef.current?.click()} data-testid="ai-select-photo" className="btn-accent text-sm">Choose photo</button>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="ai-file-input" />
            </div>
            {preview && (
              <button onClick={extract} disabled={extracting} data-testid="ai-extract-btn" className="btn-primary w-full">
                <Sparkle size={16} weight="fill" /> {extracting ? "Reading your menu…" : "Extract items with AI"}
              </button>
            )}
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="overline">{items.length} items detected</div>
              <button onClick={()=>{ setItems([]); setPreview(null); setFile(null); }} className="text-xs text-ink-600 hover:text-ink-900">← Upload another photo</button>
            </div>
            <div className="max-h-[420px] overflow-y-auto pr-2 space-y-2">
              {items.map((it) => (
                <div key={it._id} className={`border rounded-lg p-3 grid grid-cols-12 gap-2 items-start ${it._selected ? "border-clay-300 bg-clay-50/40" : "border-ink-200 bg-ink-100/40 opacity-60"}`} data-testid={`ai-item-${it._id}`}>
                  <input type="checkbox" checked={it._selected} onChange={(e)=>updateItem(it._id, "_selected", e.target.checked)} className="col-span-1 mt-2 accent-clay-600" />
                  <input value={it.name} onChange={(e)=>updateItem(it._id, "name", e.target.value)} placeholder="Name" className="col-span-4 input-field !py-2 text-sm" />
                  <input value={it.category} onChange={(e)=>updateItem(it._id, "category", e.target.value)} placeholder="Category" className="col-span-3 input-field !py-2 text-sm" />
                  <input type="number" step="0.01" value={it.price} onChange={(e)=>updateItem(it._id, "price", e.target.value)} placeholder="Price" className="col-span-2 input-field !py-2 text-sm mono" />
                  <div className="col-span-2 flex items-center gap-1">
                    <button type="button" onClick={()=>updateItem(it._id, "veg", !it.veg)} className={`text-xs px-2 py-1 rounded border ${it.veg ? "border-moss-500 bg-moss-50 text-moss-700" : "border-clay-500 bg-clay-50 text-clay-700"}`}>{it.veg ? "Veg" : "Non"}</button>
                    <button type="button" onClick={()=>removeItem(it._id)} className="text-ink-400 hover:text-red-500 w-6 h-6 grid place-items-center"><Trash size={12} /></button>
                  </div>
                  <input value={it.description||""} onChange={(e)=>updateItem(it._id, "description", e.target.value)} placeholder="Description (optional)" className="col-span-12 input-field !py-1.5 text-xs" />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-6 border-t border-ink-200 mt-6">
              <div className="text-sm text-ink-600">{items.filter(i => i._selected).length} selected · will create categories automatically</div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
                <button onClick={saveAll} disabled={saving} data-testid="ai-save-all-btn" className="btn-accent text-sm">
                  <Check size={14} weight="bold" /> {saving ? "Saving..." : `Save ${items.filter(i => i._selected).length} items`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, size = "md" }) {
  const width = size === "lg" ? "max-w-2xl" : "max-w-md";
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()} className={`bg-white rounded-2xl shadow-2xl w-full ${width} my-8 border border-ink-200`}>
        {children}
      </div>
    </div>
  );
}

function CategoryModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post("/categories", { name, order: 0 }); toast.success("Category added"); onSaved(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setSaving(false); }
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={save} className="p-8" data-testid="category-modal">
        <div className="overline mb-2">New category</div>
        <h3 className="display text-2xl font-semibold text-ink-900 mb-6">Add a menu category</h3>
        <label className="overline block mb-2">Name</label>
        <input autoFocus required data-testid="category-name-input" className="input-field mb-6" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Starters" />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button disabled={saving} type="submit" data-testid="category-save-btn" className="btn-accent text-sm">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ItemModal({ cats, existing, onClose, onSaved }) {
  const [form, setForm] = useState(existing || {
    name: "", description: "", price: "", category_id: cats[0]?.category_id || "",
    image_url: null, veg: true, bestseller: false, spicy_level: 0, available: true, order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef(null);

  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return; setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, image_url: data.url }); toast.success("Image uploaded");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setUploading(false); }
  };
  const generateDesc = async () => {
    if (!form.name) return toast.error("Enter an item name first");
    setAiLoading(true);
    try {
      const { data } = await api.post("/ai/describe", { item_name: form.name, hints: form.description });
      setForm({ ...form, description: data.description }); toast.success("AI description ready");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setAiLoading(false); }
  };
  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, price: parseFloat(form.price), spicy_level: parseInt(form.spicy_level)||0, order: parseInt(form.order)||0 };
    try {
      if (existing) await api.patch(`/items/${existing.item_id}`, payload); else await api.post("/items", payload);
      toast.success(existing ? "Updated" : "Added"); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} size="lg">
      <form onSubmit={save} className="p-8" data-testid="item-modal">
        <div className="overline mb-2">{existing ? "Edit" : "New"} item</div>
        <h3 className="display text-2xl font-semibold text-ink-900 mb-6">{existing ? "Update menu item" : "Add a menu item"}</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="overline block mb-2">Name</label>
            <input required data-testid="item-name" className="input-field" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="overline">Description</label>
              <button type="button" onClick={generateDesc} disabled={aiLoading} data-testid="ai-describe-btn" className="text-xs text-clay-600 hover:text-clay-700 flex items-center gap-1 disabled:opacity-50">
                <Sparkle size={12} weight="fill" /> {aiLoading ? "Generating..." : "Generate with AI"}
              </button>
            </div>
            <textarea data-testid="item-description" className="input-field min-h-[80px]" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />
          </div>
          <div>
            <label className="overline block mb-2">Price</label>
            <input required type="number" step="0.01" data-testid="item-price" className="input-field mono" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} />
          </div>
          <div>
            <label className="overline block mb-2">Category</label>
            <select required data-testid="item-category" className="input-field" value={form.category_id} onChange={(e)=>setForm({...form,category_id:e.target.value})}>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="overline block mb-2">Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-lg border border-ink-200 bg-ink-100 grid place-items-center overflow-hidden text-ink-300">
                {form.image_url ? <img src={`${BACKEND_URL}${form.image_url}`} className="w-full h-full object-cover" alt="" /> : <ImageSquare size={30} weight="regular" />}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" data-testid="item-image-input" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost text-xs">
                  <Camera size={14} weight="fill" /> {uploading ? "Uploading..." : "Upload"}
                </button>
                <div className="text-xs text-ink-500 mt-2">PNG or JPG, up to 5MB</div>
              </div>
            </div>
          </div>
          <div>
            <label className="overline block mb-2">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={()=>setForm({...form, veg: true})} data-testid="item-veg" className={`flex-1 px-3 py-2 rounded-md border text-sm ${form.veg ? "border-moss-500 bg-moss-50 text-moss-700" : "border-ink-200 text-ink-600"}`}>Veg</button>
              <button type="button" onClick={()=>setForm({...form, veg: false})} data-testid="item-nonveg" className={`flex-1 px-3 py-2 rounded-md border text-sm ${!form.veg ? "border-clay-500 bg-clay-50 text-clay-700" : "border-ink-200 text-ink-600"}`}>Non-veg</button>
            </div>
          </div>
          <div>
            <label className="overline block mb-2">Spicy level</label>
            <div className="flex gap-2">
              {[0,1,2,3].map((n) => (
                <button key={n} type="button" onClick={()=>setForm({...form,spicy_level:n})} data-testid={`item-spicy-${n}`} className={`flex-1 px-3 py-2 rounded-md border text-sm ${form.spicy_level === n ? "border-clay-500 bg-clay-50 text-clay-700" : "border-ink-200 text-ink-600"}`}>
                  {n === 0 ? "None" : "🌶".repeat(n)}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-6 items-center pt-2">
            <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
              <input type="checkbox" checked={form.bestseller} onChange={(e)=>setForm({...form,bestseller:e.target.checked})} data-testid="item-bestseller" className="accent-clay-600" /> Bestseller
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
              <input type="checkbox" checked={form.available} onChange={(e)=>setForm({...form,available:e.target.checked})} data-testid="item-available" className="accent-clay-600" /> Available
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-ink-200">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button disabled={saving} type="submit" data-testid="item-save-btn" className="btn-accent text-sm">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ================== QR TAB ================== */
function QRTab({ restaurant, tables, reload }) {
  const [label, setLabel] = useState("");
  const [activeQR, setActiveQR] = useState({ url: `${window.location.origin}/r/${restaurant.slug}`, name: restaurant.name, tableLabel: null });

  const addTable = async (e) => {
    e.preventDefault(); if (!label.trim()) return;
    try { await api.post("/tables", { label }); setLabel(""); reload(); toast.success("Table added"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const downloadPNG = () => {
    const canvas = document.querySelector("#qr-canvas canvas"); if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${restaurant.slug}${activeQR.tableLabel ? "-" + activeQR.tableLabel : ""}.png`;
    link.href = canvas.toDataURL("image/png"); link.click();
  };
  const downloadSVG = () => {
    const svg = document.querySelector("#qr-svg svg"); if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `qr-${restaurant.slug}${activeQR.tableLabel ? "-" + activeQR.tableLabel : ""}.svg`;
    link.href = url; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card-editorial p-8">
        <div className="overline mb-2">QR Preview</div>
        <div className="display text-xl text-ink-900 mb-1 font-semibold">{activeQR.name}</div>
        <div className="mono text-xs text-ink-500 mb-6 truncate">{activeQR.url}</div>
        <div id="qr-canvas" className="bg-ink-50 rounded-2xl p-6 aspect-square max-w-xs mx-auto grid place-items-center border border-ink-200">
          <QRCodeCanvas value={activeQR.url} size={256} bgColor="#FAF7F2" fgColor="#0F0E0C" level="H" />
        </div>
        <div id="qr-svg" className="hidden"><QRCodeSVG value={activeQR.url} size={512} bgColor="#FAF7F2" fgColor="#0F0E0C" level="H" /></div>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={downloadPNG} data-testid="qr-download-png" className="btn-accent text-sm"><Download size={14} weight="bold" /> PNG</button>
          <button onClick={downloadSVG} data-testid="qr-download-svg" className="btn-ghost text-sm"><Download size={14} weight="bold" /> SVG</button>
        </div>
      </div>

      <div>
        <div className="card-editorial p-6 mb-5">
          <div className="overline mb-3">Restaurant QR</div>
          <button onClick={() => setActiveQR({ url: `${window.location.origin}/r/${restaurant.slug}`, name: restaurant.name, tableLabel: null })} className={`w-full text-left p-3 rounded-lg flex items-center justify-between ${activeQR.tableLabel === null ? "bg-ink-900 text-ink-50 border border-ink-900" : "border border-ink-200 hover:border-ink-400"}`} data-testid="qr-select-main">
            <span className="text-sm font-medium">Main menu QR</span>
            <QrCode size={16} />
          </button>
        </div>

        <div className="card-editorial p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Table QRs</div>
            <span className="mono text-xs text-ink-500">{tables.length}</span>
          </div>
          <form onSubmit={addTable} className="flex gap-2 mb-4">
            <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Table label (e.g. T1)" className="input-field flex-1" data-testid="table-input" />
            <button type="submit" className="btn-accent text-sm" data-testid="table-add-btn"><Plus size={14} weight="bold" /></button>
          </form>
          <div className="grid sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto">
            {tables.map((t) => (
              <div key={t.table_id} className="group flex items-center border border-ink-200 rounded-md hover:border-ink-400" data-testid={`table-${t.table_id}`}>
                <button onClick={() => setActiveQR({ url: `${window.location.origin}/r/${restaurant.slug}?table=${encodeURIComponent(t.label)}`, name: `${restaurant.name} · Table ${t.label}`, tableLabel: t.label })} className="flex-1 text-left px-3 py-2 text-sm text-ink-700 hover:text-clay-600">
                  <TagChevron size={12} className="inline mr-2" /> {t.label}
                </button>
                <button onClick={async () => { await api.delete(`/tables/${t.table_id}`); reload(); }} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-red-500 w-7 h-7 grid place-items-center" data-testid={`del-table-${t.table_id}`}>
                  <Trash size={12} />
                </button>
              </div>
            ))}
            {tables.length === 0 && <div className="col-span-2 text-xs text-ink-500 py-4 text-center">No tables yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== ORDERS TAB ================== */
function OrdersTab({ orders, restaurant, reload }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const updateStatus = async (order_id, status) => {
    try { await api.patch(`/orders/${order_id}`, { status }); toast.success(`Marked ${status}`); reload(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="card-editorial p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="overline">Orders</div>
          <div className="text-ink-500 text-sm">{filtered.length} shown</div>
        </div>
        <div className="flex gap-1 p-1 bg-ink-100 rounded-full">
          {["all", ...ORDER_STATUS.map(s => s.id)].map((s) => (
            <button key={s} onClick={()=>setFilter(s)} data-testid={`order-filter-${s}`} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-white text-ink-900 shadow-sm" : "text-ink-600"}`}>
              {s === "all" ? "All" : ORDER_STATUS.find(x=>x.id===s)?.label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <Notepad size={36} weight="regular" className="mx-auto text-ink-300 mb-3" />
          <div className="display text-ink-900">No orders</div>
          <div className="text-ink-500 text-sm mt-1">Orders placed by customers will appear here.</div>
        </div>
      ) : (
        <div className="divide-y divide-ink-200">
          {filtered.map((o) => {
            const st = ORDER_STATUS.find((s) => s.id === o.status) || ORDER_STATUS[0];
            return (
              <div key={o.order_id} className="py-5 grid grid-cols-12 gap-4 items-center" data-testid={`order-${o.order_id}`}>
                <div className="col-span-2">
                  <div className="mono text-xs text-ink-400">#{o.order_id.slice(-6)}</div>
                  <span className={`inline-block mt-1 pill border ${st.color}`}>{st.label}</span>
                </div>
                <div className="col-span-3">
                  <div className="text-ink-900 text-sm font-medium">{o.customer_name}</div>
                  <div className="text-ink-500 text-xs mono">{o.customer_phone}{o.table_number ? ` · T${o.table_number}` : ""} · {o.order_type}</div>
                </div>
                <div className="col-span-4 text-ink-600 text-xs">
                  {o.items.map((i) => `${i.quantity}×${i.name}`).join(", ")}
                </div>
                <div className="col-span-1 mono text-clay-600 font-bold text-right">{restaurant.currency}{o.total}</div>
                <div className="col-span-2 flex justify-end">
                  <select value={o.status} onChange={(e)=>updateStatus(o.order_id, e.target.value)} data-testid={`order-status-${o.order_id}`} className="input-field !py-1.5 !px-2 text-xs">
                    {ORDER_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================== COUPONS TAB ================== */
function CouponsTab({ coupons, restaurant, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ code: "", kind: "percent", value: 10, min_order: 0, max_discount: "", active: true });
  const [saving, setSaving] = useState(false);

  const create = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/coupons", { ...form, value: parseFloat(form.value), min_order: parseFloat(form.min_order)||0, max_discount: form.max_discount ? parseFloat(form.max_discount) : null });
      toast.success("Coupon created"); setShow(false); reload();
      setForm({ code: "", kind: "percent", value: 10, min_order: 0, max_discount: "", active: true });
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setSaving(false); }
  };
  const toggle = async (c) => { await api.patch(`/coupons/${c.coupon_id}`, { active: !c.active }); reload(); };
  const del = async (c) => { if (confirm(`Delete ${c.code}?`)) { await api.delete(`/coupons/${c.coupon_id}`); reload(); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="overline">Coupons</div>
          <div className="text-ink-500 text-sm">Create discount codes for customers</div>
        </div>
        <button onClick={()=>setShow(true)} className="btn-accent text-sm" data-testid="coupon-add-btn"><Plus size={14} weight="bold" /> New coupon</button>
      </div>
      {coupons.length === 0 ? (
        <div className="card-editorial p-16 text-center">
          <Tag size={36} weight="regular" className="mx-auto text-ink-300 mb-4" />
          <div className="display text-xl text-ink-900">No coupons yet</div>
          <div className="text-ink-500 text-sm mt-1">Create your first discount code.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.coupon_id} className="card-editorial p-6 relative" data-testid={`coupon-${c.coupon_id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="mono text-lg font-bold text-ink-900 tracking-wider">{c.code}</div>
                  <div className="display font-semibold text-clay-600 text-2xl mt-1">
                    {c.kind === "percent" ? `${c.value}%` : `${restaurant.currency}${c.value}`}
                    <span className="text-ink-500 text-sm font-normal ml-1">off</span>
                  </div>
                </div>
                <button onClick={()=>toggle(c)} data-testid={`coupon-toggle-${c.coupon_id}`} className={`pill ${c.active ? "bg-moss-50 text-moss-700" : "bg-ink-100 text-ink-500"}`}>{c.active ? "Active" : "Paused"}</button>
              </div>
              <div className="text-xs text-ink-500 mt-4 space-y-1">
                {c.min_order > 0 && <div>Min order: {restaurant.currency}{c.min_order}</div>}
                {c.max_discount && <div>Max discount: {restaurant.currency}{c.max_discount}</div>}
              </div>
              <button onClick={()=>del(c)} data-testid={`coupon-del-${c.coupon_id}`} className="absolute top-4 right-14 text-ink-300 hover:text-red-500 w-7 h-7 grid place-items-center"><Trash size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {show && (
        <Modal onClose={()=>setShow(false)}>
          <form onSubmit={create} className="p-8" data-testid="coupon-modal">
            <div className="overline mb-2">New coupon</div>
            <h3 className="display text-2xl font-semibold text-ink-900 mb-6">Create a discount code</h3>
            <div className="space-y-4">
              <div>
                <label className="overline block mb-2">Code (uppercase)</label>
                <input required data-testid="coupon-code" className="input-field mono uppercase" value={form.code} onChange={(e)=>setForm({...form, code: e.target.value.toUpperCase()})} placeholder="SAVE10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="overline block mb-2">Type</label>
                  <select className="input-field" value={form.kind} onChange={(e)=>setForm({...form, kind: e.target.value})} data-testid="coupon-kind">
                    <option value="percent">Percentage</option>
                    <option value="flat">Flat amount</option>
                  </select>
                </div>
                <div>
                  <label className="overline block mb-2">Value {form.kind === "percent" ? "(%)" : `(${restaurant.currency})`}</label>
                  <input required type="number" step="0.01" data-testid="coupon-value" className="input-field mono" value={form.value} onChange={(e)=>setForm({...form, value: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="overline block mb-2">Min order</label>
                  <input type="number" step="0.01" className="input-field mono" value={form.min_order} onChange={(e)=>setForm({...form, min_order: e.target.value})} />
                </div>
                {form.kind === "percent" && (
                  <div>
                    <label className="overline block mb-2">Max discount (optional)</label>
                    <input type="number" step="0.01" className="input-field mono" value={form.max_discount} onChange={(e)=>setForm({...form, max_discount: e.target.value})} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button type="button" onClick={()=>setShow(false)} className="btn-ghost text-sm">Cancel</button>
              <button disabled={saving} type="submit" data-testid="coupon-save-btn" className="btn-accent text-sm">{saving ? "Saving..." : "Create"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ================== REVIEWS TAB ================== */
function ReviewsTab({ reviews }) {
  const avg = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  return (
    <div className="grid lg:grid-cols-4 gap-5">
      <div className="card-editorial p-8">
        <div className="overline mb-3">Overall</div>
        <div className="display text-6xl font-semibold text-ink-900">{avg}</div>
        <div className="flex gap-0.5 mt-3">
          {Array.from({length:5}).map((_,i) => <Star key={i} size={16} weight={i < Math.round(parseFloat(avg)) ? "fill" : "regular"} className="text-clay-500" />)}
        </div>
        <div className="text-ink-500 text-sm mt-2">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
      </div>
      <div className="lg:col-span-3 space-y-3">
        {reviews.length === 0 ? (
          <div className="card-editorial p-16 text-center">
            <Star size={36} weight="regular" className="mx-auto text-ink-300 mb-4" />
            <div className="display text-xl text-ink-900">No reviews yet</div>
            <div className="text-ink-500 text-sm mt-1">Customer reviews will appear here.</div>
          </div>
        ) : reviews.map((r) => (
          <div key={r.review_id} className="card-editorial p-6" data-testid={`review-${r.review_id}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="display font-semibold text-ink-900">{r.customer_name}</div>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({length:5}).map((_,i) => <Star key={i} size={12} weight={i < r.rating ? "fill" : "regular"} className="text-clay-500" />)}
                </div>
              </div>
              <div className="mono text-xs text-ink-400">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            {r.comment && <p className="text-ink-700 text-sm mt-4 leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================== ANALYTICS TAB ================== */
function AnalyticsTab({ analytics }) {
  if (!analytics) return <div className="card-editorial p-10 text-ink-500 text-sm">Loading analytics…</div>;
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="QR scans" value={analytics.scans} />
        <StatCard label="Orders" value={analytics.orders} />
        <StatCard label="Menu items" value={analytics.items} />
        <StatCard label="Categories" value={analytics.categories} />
        <StatCard label="Tables" value={analytics.tables} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-editorial p-6">
          <div className="overline mb-4">Scans · last 7 days</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={analytics.trend}>
                <CartesianGrid stroke="rgba(15,14,12,0.06)" />
                <XAxis dataKey="day" stroke="#6B665F" fontSize={11} />
                <YAxis stroke="#6B665F" fontSize={11} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E8E2D5", borderRadius: 12 }} />
                <Line type="monotone" dataKey="scans" stroke="#C2410C" strokeWidth={2.5} dot={{ fill: "#C2410C", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-editorial p-6">
          <div className="overline mb-4">Popular items</div>
          {analytics.popular.length === 0 ? (
            <div className="text-sm text-ink-500 py-6 text-center">No orders yet.</div>
          ) : (
            <div className="space-y-3">
              {analytics.popular.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="mono text-xs text-ink-400 w-5">0{i+1}</span>
                    <span className="text-ink-900 text-sm truncate">{p.name}</span>
                  </div>
                  <span className="mono text-clay-600 text-sm">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================== PROFILE TAB ================== */
function ProfileTab({ restaurant, reload }) {
  const [form, setForm] = useState({
    ...restaurant,
    gallery: restaurant.gallery || [],
  });
  const [saving, setSaving] = useState(false);
  const logoRef = useRef(null); const bannerRef = useRef(null); const galleryRef = useRef(null);

  const upload = async (kind, e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (kind === "gallery") setForm({ ...form, gallery: [...(form.gallery||[]), data.url] });
      else setForm({ ...form, [`${kind}_url`]: data.url });
      toast.success("Uploaded");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const removeGallery = (url) => setForm({ ...form, gallery: (form.gallery || []).filter((g) => g !== url) });
  const save = async () => {
    setSaving(true);
    try { await api.patch("/restaurant/me", form); toast.success("Saved"); reload(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        {/* Branding */}
        <div className="card-editorial p-6">
          <div className="overline mb-4">Branding</div>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="overline mb-2">Logo</div>
              <div className="w-28 h-28 rounded-lg border border-ink-200 bg-ink-100 grid place-items-center overflow-hidden text-ink-300 mb-2">
                {form.logo_url ? <img src={`${BACKEND_URL}${form.logo_url}`} className="w-full h-full object-cover" alt="" /> : <ImageSquare size={30} weight="regular" />}
              </div>
              <input ref={logoRef} type="file" accept="image/*" onChange={(e)=>upload("logo", e)} className="hidden" data-testid="logo-input" />
              <button onClick={()=>logoRef.current?.click()} className="btn-ghost text-xs w-full">Upload logo</button>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="overline mb-2">Banner</div>
              <div className="w-full h-28 rounded-lg border border-ink-200 bg-ink-100 overflow-hidden grid place-items-center text-ink-300 mb-2">
                {form.banner_url ? <img src={`${BACKEND_URL}${form.banner_url}`} className="w-full h-full object-cover" alt="" /> : <ImageSquare size={30} weight="regular" />}
              </div>
              <input ref={bannerRef} type="file" accept="image/*" onChange={(e)=>upload("banner", e)} className="hidden" data-testid="banner-input" />
              <button onClick={()=>bannerRef.current?.click()} className="btn-ghost text-xs w-full">Upload banner</button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="card-editorial p-6 space-y-4">
          <div className="overline">Restaurant details</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="overline block mb-2">Name</label><input data-testid="profile-name" className="input-field" value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} /></div>
            <div><label className="overline block mb-2">Tagline</label><input data-testid="profile-tagline" className="input-field" value={form.tagline||""} onChange={(e)=>setForm({...form,tagline:e.target.value})} /></div>
            <div className="sm:col-span-2"><label className="overline block mb-2">About us</label><textarea data-testid="profile-about" className="input-field min-h-[80px]" value={form.about_us||""} onChange={(e)=>setForm({...form,about_us:e.target.value})} /></div>
            <div className="sm:col-span-2"><label className="overline block mb-2">Address</label><input data-testid="profile-address" className="input-field" value={form.address||""} onChange={(e)=>setForm({...form,address:e.target.value})} /></div>
            <div><label className="overline block mb-2">Phone</label><input data-testid="profile-phone" className="input-field" value={form.phone||""} onChange={(e)=>setForm({...form,phone:e.target.value})} /></div>
            <div><label className="overline block mb-2">WhatsApp (with country code)</label><input placeholder="e.g. +91987..." data-testid="profile-whatsapp" className="input-field" value={form.whatsapp||""} onChange={(e)=>setForm({...form,whatsapp:e.target.value})} /></div>
            <div className="sm:col-span-2"><label className="overline block mb-2">Google Maps URL</label><input data-testid="profile-map" className="input-field" value={form.google_map||""} onChange={(e)=>setForm({...form,google_map:e.target.value})} /></div>
            <div><label className="overline block mb-2">Business hours</label><input data-testid="profile-hours" className="input-field" value={form.business_hours||""} onChange={(e)=>setForm({...form,business_hours:e.target.value})} /></div>
            <div><label className="overline block mb-2">Currency</label><input className="input-field" value={form.currency||""} onChange={(e)=>setForm({...form,currency:e.target.value})} data-testid="profile-currency" /></div>
          </div>
        </div>

        {/* Tax & delivery */}
        <div className="card-editorial p-6">
          <div className="overline mb-4">Tax & fees</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="overline block mb-2">GST %</label><input type="number" step="0.1" className="input-field mono" value={form.gst_percent||0} onChange={(e)=>setForm({...form,gst_percent:parseFloat(e.target.value)||0})} data-testid="profile-gst" /></div>
            <div><label className="overline block mb-2">Service %</label><input type="number" step="0.1" className="input-field mono" value={form.service_charge_percent||0} onChange={(e)=>setForm({...form,service_charge_percent:parseFloat(e.target.value)||0})} data-testid="profile-service" /></div>
            <div><label className="overline block mb-2">Delivery fee</label><input type="number" step="0.01" className="input-field mono" value={form.delivery_charge||0} onChange={(e)=>setForm({...form,delivery_charge:parseFloat(e.target.value)||0})} data-testid="profile-delivery" /></div>
            <div><label className="overline block mb-2">Min order</label><input type="number" step="0.01" className="input-field mono" value={form.min_order||0} onChange={(e)=>setForm({...form,min_order:parseFloat(e.target.value)||0})} data-testid="profile-minorder" /></div>
          </div>
        </div>

        {/* Offer banner */}
        <div className="card-editorial p-6">
          <div className="overline mb-4">Offer banner</div>
          <input placeholder="e.g. 20% OFF this weekend — use code WEEKEND20" className="input-field mb-3" value={form.offer_banner||""} onChange={(e)=>setForm({...form,offer_banner:e.target.value})} data-testid="profile-banner-text" />
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
            <input type="checkbox" checked={!!form.offer_banner_active} onChange={(e)=>setForm({...form,offer_banner_active:e.target.checked})} data-testid="profile-banner-active" className="accent-clay-600" /> Show on public menu
          </label>
        </div>

        {/* Gallery */}
        <div className="card-editorial p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Gallery</div>
            <button onClick={()=>galleryRef.current?.click()} className="btn-ghost text-xs"><Plus size={12} weight="bold" /> Add photo</button>
            <input ref={galleryRef} type="file" accept="image/*" onChange={(e)=>upload("gallery", e)} className="hidden" data-testid="gallery-input" />
          </div>
          {(form.gallery || []).length === 0 ? (
            <div className="text-sm text-ink-500 py-6 text-center">No gallery photos yet.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(form.gallery || []).map((g) => (
                <div key={g} className="relative aspect-square rounded-lg overflow-hidden bg-ink-100 group">
                  <img src={`${BACKEND_URL}${g}`} className="w-full h-full object-cover" alt="" />
                  <button onClick={()=>removeGallery(g)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-red-600 grid place-items-center opacity-0 group-hover:opacity-100"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order types */}
        <div className="card-editorial p-6">
          <div className="overline mb-4">Order types</div>
          <div className="flex gap-3 flex-wrap">
            {[
              { k: "accept_dine_in", l: "Dine-in" },
              { k: "accept_takeaway", l: "Takeaway" },
              { k: "accept_delivery", l: "Delivery" },
            ].map((o) => (
              <label key={o.k} className={`px-4 py-2.5 rounded-lg border text-sm cursor-pointer ${form[o.k] ? "border-clay-500 bg-clay-50 text-clay-700" : "border-ink-200 text-ink-600"}`}>
                <input type="checkbox" checked={!!form[o.k]} onChange={(e)=>setForm({...form, [o.k]: e.target.checked})} className="mr-2 accent-clay-600" data-testid={`profile-${o.k}`} />
                {o.l}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-editorial p-6">
          <div className="overline mb-3">Status</div>
          <button onClick={()=>setForm({...form, is_open: !form.is_open})} data-testid="profile-open-toggle" className={`w-full py-3 rounded-lg text-sm font-medium border ${form.is_open ? "border-moss-500 bg-moss-50 text-moss-700" : "border-red-300 bg-red-50 text-red-700"}`}>
            {form.is_open ? "● Open — accepting orders" : "● Closed"}
          </button>
        </div>
        <div className="card-editorial p-6">
          <div className="overline mb-3">Theme</div>
          <div className="flex gap-2 mb-3">
            {[{v:"warm",l:"Warm"},{v:"dark",l:"Dark"}].map((t) => (
              <button key={t.v} onClick={()=>setForm({...form, theme: t.v})} data-testid={`theme-${t.v}`} className={`flex-1 py-2 rounded-md border text-sm ${form.theme === t.v ? "border-clay-500 bg-clay-50 text-clay-700" : "border-ink-200 text-ink-600"}`}>{t.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={form.accent_color||"#C2410C"} onChange={(e)=>setForm({...form,accent_color:e.target.value})} data-testid="profile-accent" className="w-12 h-9 rounded-md border border-ink-200 bg-transparent" />
            <span className="mono text-xs text-ink-500">{form.accent_color}</span>
          </div>
        </div>
        <button onClick={save} disabled={saving} data-testid="profile-save-btn" className="btn-accent w-full">
          <Check size={16} weight="bold" /> {saving ? "Saving..." : "Save all changes"}
        </button>
      </div>
    </div>
  );
}

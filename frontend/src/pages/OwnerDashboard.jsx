import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError, BACKEND_URL } from "../lib/api";
import DashNav from "../components/layout/DashNav";
import { toast } from "sonner";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  Plus, Trash, PencilSimple, Sparkle, Download, QrCode, Camera, TagChevron,
  Storefront, ForkKnife, Table, ChartLineUp, GearSix, Notepad, ImageSquare, Fire, Check
} from "@phosphor-icons/react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const TABS = [
  { id: "menu", label: "Menu", icon: ForkKnife },
  { id: "qr", label: "QR & Tables", icon: QrCode },
  { id: "orders", label: "Orders", icon: Notepad },
  { id: "analytics", label: "Analytics", icon: ChartLineUp },
  { id: "profile", label: "Restaurant", icon: Storefront },
];

function StatCard({ label, value, sub }) {
  return (
    <div className="cyber-card p-6">
      <div className="overline text-white/40">{label}</div>
      <div className="mt-3 mono text-3xl text-white font-bold">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
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
  const [analytics, setAnalytics] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (user === false) nav("/login");
    if (user && user.role === "admin") nav("/admin");
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
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { if (user && user.user_id) load(); /* eslint-disable-next-line */ }, [user?.user_id]);

  useEffect(() => {
    if (tab === "analytics" && user?.user_id) api.get("/analytics/owner").then((r) => setAnalytics(r.data)).catch(()=>{});
    if (tab === "orders" && user?.user_id) api.get("/orders").then((r) => setOrders(r.data)).catch(()=>{});
  }, [tab, user?.user_id]);

  if (!user || user === false || !restaurant) {
    return (
      <div className="cyber-bg min-h-screen grid place-items-center">
        <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="cyber-bg cyber-noise min-h-screen">
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
      <DashNav title="Owner console" slug={restaurant.slug} />
      <div className="relative max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-start justify-between flex-wrap gap-6 mb-8">
          <div>
            <div className="overline text-cyan-300">Restaurant</div>
            <h1 className="font-display font-bold text-4xl text-white tracking-tight mt-1">{restaurant.name}</h1>
            <div className="mt-2 text-white/40 mono text-xs uppercase tracking-widest">/r/{restaurant.slug}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                  tab === t.id
                    ? "bg-cyan-400/15 border border-cyan-400/40 text-cyan-300"
                    : "border border-white/10 text-white/60 hover:text-white hover:border-white/20"
                }`}
              >
                <t.icon size={14} weight="bold" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "menu" && <MenuTab cats={cats} items={items} restaurant={restaurant} reload={load} />}
        {tab === "qr" && <QRTab restaurant={restaurant} tables={tables} reload={load} />}
        {tab === "orders" && <OrdersTab orders={orders} restaurant={restaurant} />}
        {tab === "analytics" && <AnalyticsTab analytics={analytics} />}
        {tab === "profile" && <ProfileTab restaurant={restaurant} reload={load} />}
      </div>
    </div>
  );
}

/* ------------------ MENU TAB ------------------ */
function MenuTab({ cats, items, restaurant, reload }) {
  const [showCat, setShowCat] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [activeCat, setActiveCat] = useState(null);

  const filteredItems = useMemo(() => activeCat ? items.filter((i) => i.category_id === activeCat) : items, [items, activeCat]);

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Categories column */}
      <div className="lg:col-span-3 cyber-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="overline">Categories</div>
          <button onClick={() => setShowCat(true)} data-testid="add-category-btn" className="w-8 h-8 rounded-md border border-white/10 hover:border-cyan-400/50 text-white/60 hover:text-cyan-300 grid place-items-center">
            <Plus size={14} weight="bold" />
          </button>
        </div>
        <div className="space-y-1">
          <button onClick={() => setActiveCat(null)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeCat === null ? "bg-white/5 text-white" : "text-white/60 hover:bg-white/5"}`}>
            All items <span className="mono text-xs text-white/40 float-right">{items.length}</span>
          </button>
          {cats.map((c) => (
            <div key={c.category_id} className="group flex items-center">
              <button
                onClick={() => setActiveCat(c.category_id)}
                data-testid={`cat-${c.category_id}`}
                className={`flex-1 text-left px-3 py-2 rounded-md text-sm truncate ${activeCat === c.category_id ? "bg-white/5 text-white" : "text-white/60 hover:bg-white/5"}`}
              >
                {c.name}
                <span className="mono text-xs text-white/40 float-right">{items.filter(i => i.category_id === c.category_id).length}</span>
              </button>
              <button
                onClick={async () => { if (confirm(`Delete category "${c.name}"? Items will be removed.`)) { await api.delete(`/categories/${c.category_id}`); toast.success("Deleted"); reload(); } }}
                data-testid={`del-cat-${c.category_id}`}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 w-8 h-8 grid place-items-center"
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
          {cats.length === 0 && <div className="text-xs text-white/40 px-3 py-4">No categories yet. Create your first.</div>}
        </div>
      </div>

      {/* Items grid */}
      <div className="lg:col-span-9">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="overline">Menu items</div>
            <div className="text-white/50 text-sm">{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</div>
          </div>
          <button
            onClick={() => { if (cats.length === 0) return toast.error("Create a category first"); setEditItem(null); setShowItem(true); }}
            data-testid="add-item-btn"
            className="cyber-btn text-sm"
          >
            <Plus size={16} weight="bold" /> Add item
          </button>
        </div>
        {filteredItems.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <ForkKnife size={40} weight="duotone" className="text-cyan-300/60 mx-auto mb-4" />
            <div className="font-display text-white text-lg">No items yet</div>
            <div className="text-white/50 text-sm mt-1">Add your first delicious item to get started.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((it) => (
              <div key={it.item_id} className="cyber-card overflow-hidden" data-testid={`item-${it.item_id}`}>
                <div className="aspect-[16/10] bg-white/5 relative overflow-hidden">
                  {it.image_url ? (
                    <img src={`${BACKEND_URL}${it.image_url}`} alt={it.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-white/20">
                      <ImageSquare size={40} weight="duotone" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className={`warm-pill text-xs ${it.veg ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}`}>
                      {it.veg ? "Veg" : "Non-veg"}
                    </span>
                    {it.bestseller && <span className="warm-pill text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Best</span>}
                    {it.spicy_level > 0 && <span className="warm-pill text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1"><Fire size={10} weight="fill" />{it.spicy_level}</span>}
                  </div>
                  {!it.available && <div className="absolute inset-0 bg-black/70 grid place-items-center text-white/70 mono uppercase text-xs">Unavailable</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-white truncate">{it.name}</div>
                      <div className="text-xs text-white/50 mt-1 line-clamp-2 min-h-[2rem]">{it.description || "No description"}</div>
                    </div>
                    <div className="mono text-cyan-300 font-bold">{restaurant.currency}{it.price}</div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => { setEditItem(it); setShowItem(true); }} data-testid={`edit-item-${it.item_id}`} className="w-8 h-8 rounded-md border border-white/10 hover:border-cyan-400/40 text-white/60 hover:text-cyan-300 grid place-items-center">
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={async () => { if (confirm(`Delete "${it.name}"?`)) { await api.delete(`/items/${it.item_id}`); toast.success("Deleted"); reload(); } }} data-testid={`del-item-${it.item_id}`} className="w-8 h-8 rounded-md border border-white/10 hover:border-red-500/40 text-white/60 hover:text-red-400 grid place-items-center">
                      <Trash size={14} />
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
    </div>
  );
}

function CategoryModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/categories", { name, order: 0 });
      toast.success("Category added");
      onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md grid place-items-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e)=>e.stopPropagation()} className="cyber-card w-full max-w-md p-8" data-testid="category-modal">
        <div className="overline mb-2">New category</div>
        <h3 className="font-display text-2xl text-white mb-6 tracking-tight">Add a menu category</h3>
        <label className="overline block mb-2">Name</label>
        <input autoFocus required data-testid="category-name-input" className="cyber-input mb-6" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Starters" />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="cyber-btn-ghost text-sm">Cancel</button>
          <button disabled={saving} type="submit" data-testid="category-save-btn" className="cyber-btn text-sm">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
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
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, image_url: data.url });
      toast.success("Image uploaded");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail, "Upload failed")); }
    finally { setUploading(false); }
  };

  const generateDesc = async () => {
    if (!form.name) return toast.error("Enter an item name first");
    setAiLoading(true);
    try {
      const { data } = await api.post("/ai/describe", { item_name: form.name, hints: form.description });
      setForm({ ...form, description: data.description });
      toast.success("AI description ready");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail, "AI failed")); }
    finally { setAiLoading(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price), spicy_level: parseInt(form.spicy_level) || 0, order: parseInt(form.order) || 0 };
    try {
      if (existing) await api.patch(`/items/${existing.item_id}`, payload);
      else await api.post("/items", payload);
      toast.success(existing ? "Item updated" : "Item added");
      onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <form onSubmit={save} onClick={(e)=>e.stopPropagation()} className="cyber-card w-full max-w-2xl p-8 my-8" data-testid="item-modal">
        <div className="overline mb-2">{existing ? "Edit" : "New"} item</div>
        <h3 className="font-display text-2xl text-white mb-6 tracking-tight">{existing ? "Update menu item" : "Add a menu item"}</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="overline block mb-2">Name</label>
            <input required data-testid="item-name" className="cyber-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="overline">Description</label>
              <button type="button" onClick={generateDesc} disabled={aiLoading} data-testid="ai-describe-btn" className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 disabled:opacity-50">
                <Sparkle size={12} weight="fill" /> {aiLoading ? "Generating..." : "Generate with AI"}
              </button>
            </div>
            <textarea data-testid="item-description" className="cyber-input min-h-[80px]" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />
          </div>
          <div>
            <label className="overline block mb-2">Price</label>
            <input required type="number" step="0.01" data-testid="item-price" className="cyber-input mono" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} />
          </div>
          <div>
            <label className="overline block mb-2">Category</label>
            <select required data-testid="item-category" className="cyber-input" value={form.category_id} onChange={(e)=>setForm({...form,category_id:e.target.value})}>
              <option value="" className="bg-black">Select…</option>
              {cats.map((c) => <option key={c.category_id} value={c.category_id} className="bg-black">{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="overline block mb-2">Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-lg border border-white/10 bg-white/5 grid place-items-center overflow-hidden text-white/30">
                {form.image_url ? <img src={`${BACKEND_URL}${form.image_url}`} alt="" className="w-full h-full object-cover" /> : <ImageSquare size={30} weight="duotone" />}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" data-testid="item-image-input" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="cyber-btn-ghost text-xs">
                  <Camera size={14} weight="fill" /> {uploading ? "Uploading..." : "Upload photo"}
                </button>
                <div className="text-xs text-white/40 mt-2">PNG, JPG up to 5MB</div>
              </div>
            </div>
          </div>
          <div>
            <label className="overline block mb-2">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={()=>setForm({...form, veg: true})} data-testid="item-veg" className={`flex-1 px-3 py-2 rounded-md border text-sm ${form.veg ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-white/10 text-white/60"}`}>Veg</button>
              <button type="button" onClick={()=>setForm({...form, veg: false})} data-testid="item-nonveg" className={`flex-1 px-3 py-2 rounded-md border text-sm ${!form.veg ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/10 text-white/60"}`}>Non-veg</button>
            </div>
          </div>
          <div>
            <label className="overline block mb-2">Spicy level</label>
            <div className="flex gap-2">
              {[0,1,2,3].map((n)=> (
                <button key={n} type="button" onClick={()=>setForm({...form,spicy_level:n})} data-testid={`item-spicy-${n}`} className={`flex-1 px-3 py-2 rounded-md border text-sm ${form.spicy_level === n ? "border-orange-500/40 bg-orange-500/10 text-orange-400" : "border-white/10 text-white/60"}`}>
                  {n === 0 ? "None" : "🌶".repeat(n)}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-6 items-center pt-2">
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input type="checkbox" checked={form.bestseller} onChange={(e)=>setForm({...form,bestseller:e.target.checked})} data-testid="item-bestseller" className="accent-cyan-400" /> Bestseller
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input type="checkbox" checked={form.available} onChange={(e)=>setForm({...form,available:e.target.checked})} data-testid="item-available" className="accent-cyan-400" /> Available
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button type="button" onClick={onClose} className="cyber-btn-ghost text-sm">Cancel</button>
          <button disabled={saving} type="submit" data-testid="item-save-btn" className="cyber-btn text-sm">{saving ? "Saving..." : "Save item"}</button>
        </div>
      </form>
    </div>
  );
}

/* ------------------ QR TAB ------------------ */
function QRTab({ restaurant, tables, reload }) {
  const [label, setLabel] = useState("");
  const [activeQR, setActiveQR] = useState({ url: `${window.location.origin}/r/${restaurant.slug}`, name: restaurant.name, tableLabel: null });
  const canvasRef = useRef(null);

  const addTable = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    try { await api.post("/tables", { label }); setLabel(""); reload(); toast.success("Table added"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const downloadPNG = () => {
    const canvas = document.querySelector("#qr-canvas canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${restaurant.slug}${activeQR.tableLabel ? "-" + activeQR.tableLabel : ""}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  const downloadSVG = () => {
    const svg = document.querySelector("#qr-svg svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `qr-${restaurant.slug}${activeQR.tableLabel ? "-" + activeQR.tableLabel : ""}.svg`;
    link.href = url; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="cyber-card p-8">
        <div className="overline mb-2 text-cyan-300">QR Preview</div>
        <div className="font-display text-xl text-white mb-1 tracking-tight">{activeQR.name}</div>
        <div className="mono text-xs text-white/40 mb-6">{activeQR.url}</div>
        <div id="qr-canvas" className="bg-white rounded-2xl p-6 aspect-square max-w-xs mx-auto grid place-items-center scan-line-wrap">
          <QRCodeCanvas value={activeQR.url} size={256} bgColor="#FFFFFF" fgColor="#05050A" level="H" />
        </div>
        <div id="qr-svg" className="hidden">
          <QRCodeSVG value={activeQR.url} size={512} bgColor="#FFFFFF" fgColor="#05050A" level="H" />
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={downloadPNG} data-testid="qr-download-png" className="cyber-btn text-sm">
            <Download size={14} weight="bold" /> PNG
          </button>
          <button onClick={downloadSVG} data-testid="qr-download-svg" className="cyber-btn-ghost text-sm">
            <Download size={14} weight="bold" /> SVG
          </button>
        </div>
      </div>

      <div>
        <div className="cyber-card p-6 mb-6">
          <div className="overline mb-3">Restaurant QR</div>
          <button
            onClick={() => setActiveQR({ url: `${window.location.origin}/r/${restaurant.slug}`, name: restaurant.name, tableLabel: null })}
            className={`w-full text-left p-3 rounded-md flex items-center justify-between ${activeQR.tableLabel === null ? "bg-cyan-400/10 border border-cyan-400/30 text-cyan-300" : "border border-white/10 text-white/70 hover:border-white/20"}`}
            data-testid="qr-select-main"
          >
            <span className="text-sm font-medium">Main menu QR</span>
            <QrCode size={16} />
          </button>
        </div>

        <div className="cyber-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="overline">Table QRs</div>
            <span className="mono text-xs text-white/40">{tables.length}</span>
          </div>
          <form onSubmit={addTable} className="flex gap-2 mb-4">
            <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Table label (e.g. T1)" className="cyber-input flex-1" data-testid="table-input" />
            <button type="submit" className="cyber-btn text-sm" data-testid="table-add-btn"><Plus size={14} weight="bold" /> Add</button>
          </form>
          <div className="grid sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto">
            {tables.map((t) => (
              <div key={t.table_id} className="group flex items-center border border-white/10 rounded-md" data-testid={`table-${t.table_id}`}>
                <button
                  onClick={() => setActiveQR({ url: `${window.location.origin}/r/${restaurant.slug}?table=${encodeURIComponent(t.label)}`, name: `${restaurant.name} · Table ${t.label}`, tableLabel: t.label })}
                  className="flex-1 text-left px-3 py-2 text-sm text-white/70 hover:text-cyan-300"
                >
                  <TagChevron size={12} className="inline mr-2" /> {t.label}
                </button>
                <button onClick={async () => { await api.delete(`/tables/${t.table_id}`); reload(); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 w-8 h-8 grid place-items-center" data-testid={`del-table-${t.table_id}`}>
                  <Trash size={12} />
                </button>
              </div>
            ))}
            {tables.length === 0 && <div className="col-span-2 text-xs text-white/40 py-4 text-center">No tables yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ ORDERS TAB ------------------ */
function OrdersTab({ orders, restaurant }) {
  return (
    <div className="cyber-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Orders</div>
          <div className="text-white/50 text-sm">{orders.length} received</div>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="p-12 text-center">
          <Notepad size={36} weight="duotone" className="mx-auto text-cyan-300/60 mb-3" />
          <div className="text-white">No orders yet</div>
          <div className="text-white/50 text-sm mt-1">Orders placed by customers will appear here.</div>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {orders.map((o) => (
            <div key={o.order_id} className="py-4 grid grid-cols-6 gap-4 items-center" data-testid={`order-${o.order_id}`}>
              <div className="mono text-xs text-white/40 col-span-1">{o.order_id.slice(-6)}</div>
              <div className="col-span-2">
                <div className="text-white text-sm font-medium">{o.customer_name}</div>
                <div className="text-white/50 text-xs mono">{o.customer_phone}{o.table_number ? ` · Table ${o.table_number}` : ""}</div>
              </div>
              <div className="col-span-2 text-white/60 text-xs">
                {o.items.map((i) => `${i.quantity}×${i.name}`).join(", ")}
              </div>
              <div className="mono text-cyan-300 font-bold text-right">{restaurant.currency}{o.total}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------ ANALYTICS TAB ------------------ */
function AnalyticsTab({ analytics }) {
  if (!analytics) return <div className="cyber-card p-10 text-white/50 text-sm">Loading analytics…</div>;
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
        <div className="lg:col-span-2 cyber-card p-6">
          <div className="overline mb-4">Scans · last 7 days</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={analytics.trend}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#71717A" fontSize={11} />
                <YAxis stroke="#71717A" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0F0F16", border: "1px solid #27273A", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="scans" stroke="#00F0FF" strokeWidth={2} dot={{ fill: "#00F0FF" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="cyber-card p-6">
          <div className="overline mb-4">Popular items</div>
          {analytics.popular.length === 0 ? (
            <div className="text-sm text-white/40 py-6 text-center">No orders yet.</div>
          ) : (
            <div className="space-y-3">
              {analytics.popular.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="mono text-xs text-white/40 w-4">{i+1}</span>
                    <span className="text-white text-sm truncate">{p.name}</span>
                  </div>
                  <span className="mono text-cyan-300 text-sm">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------ PROFILE TAB ------------------ */
function ProfileTab({ restaurant, reload }) {
  const [form, setForm] = useState({
    name: restaurant.name || "",
    tagline: restaurant.tagline || "",
    address: restaurant.address || "",
    phone: restaurant.phone || "",
    whatsapp: restaurant.whatsapp || "",
    business_hours: restaurant.business_hours || "",
    is_open: restaurant.is_open ?? true,
    logo_url: restaurant.logo_url || null,
    banner_url: restaurant.banner_url || null,
    google_map: restaurant.google_map || "",
    theme: restaurant.theme || "warm",
    accent_color: restaurant.accent_color || "#EA580C",
    currency: restaurant.currency || "$",
  });
  const [saving, setSaving] = useState(false);
  const logoRef = useRef(null);
  const bannerRef = useRef(null);

  const upload = async (kind, e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, [`${kind}_url`]: data.url });
      toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} uploaded`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail, "Upload failed")); }
  };

  const save = async () => {
    setSaving(true);
    try { await api.patch("/restaurant/me", form); toast.success("Restaurant saved"); reload(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="cyber-card p-6">
          <div className="overline mb-4">Branding</div>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="overline mb-2">Logo</div>
              <div className="w-28 h-28 rounded-lg border border-white/10 bg-white/5 grid place-items-center overflow-hidden text-white/30 mb-2">
                {form.logo_url ? <img src={`${BACKEND_URL}${form.logo_url}`} alt="" className="w-full h-full object-cover" /> : <ImageSquare size={30} weight="duotone" />}
              </div>
              <input ref={logoRef} type="file" accept="image/*" onChange={(e)=>upload("logo", e)} className="hidden" data-testid="logo-input" />
              <button onClick={()=>logoRef.current?.click()} className="cyber-btn-ghost text-xs w-full justify-center">Upload logo</button>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="overline mb-2">Banner</div>
              <div className="w-full h-28 rounded-lg border border-white/10 bg-white/5 overflow-hidden grid place-items-center text-white/30 mb-2">
                {form.banner_url ? <img src={`${BACKEND_URL}${form.banner_url}`} alt="" className="w-full h-full object-cover" /> : <ImageSquare size={30} weight="duotone" />}
              </div>
              <input ref={bannerRef} type="file" accept="image/*" onChange={(e)=>upload("banner", e)} className="hidden" data-testid="banner-input" />
              <button onClick={()=>bannerRef.current?.click()} className="cyber-btn-ghost text-xs w-full justify-center">Upload banner</button>
            </div>
          </div>
        </div>

        <div className="cyber-card p-6 space-y-4">
          <div className="overline">Restaurant details</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="overline block mb-2">Name</label><input data-testid="profile-name" className="cyber-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></div>
            <div><label className="overline block mb-2">Tagline</label><input data-testid="profile-tagline" className="cyber-input" value={form.tagline} onChange={(e)=>setForm({...form,tagline:e.target.value})} /></div>
            <div className="sm:col-span-2"><label className="overline block mb-2">Address</label><input data-testid="profile-address" className="cyber-input" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} /></div>
            <div><label className="overline block mb-2">Phone</label><input data-testid="profile-phone" className="cyber-input" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} /></div>
            <div><label className="overline block mb-2">WhatsApp (with country code)</label><input placeholder="e.g. +91987..." data-testid="profile-whatsapp" className="cyber-input" value={form.whatsapp} onChange={(e)=>setForm({...form,whatsapp:e.target.value})} /></div>
            <div className="sm:col-span-2"><label className="overline block mb-2">Google Maps URL</label><input data-testid="profile-map" className="cyber-input" value={form.google_map} onChange={(e)=>setForm({...form,google_map:e.target.value})} /></div>
            <div><label className="overline block mb-2">Business hours</label><input data-testid="profile-hours" className="cyber-input" value={form.business_hours} onChange={(e)=>setForm({...form,business_hours:e.target.value})} /></div>
            <div>
              <label className="overline block mb-2">Currency</label>
              <input className="cyber-input" value={form.currency} onChange={(e)=>setForm({...form,currency:e.target.value})} data-testid="profile-currency" />
            </div>
          </div>
        </div>

        <div className="cyber-card p-6">
          <div className="overline mb-4">Theme</div>
          <div className="flex gap-3 mb-4">
            {["warm","dark"].map((t) => (
              <button key={t} onClick={()=>setForm({...form, theme: t})} data-testid={`theme-${t}`} className={`px-4 py-2 rounded-md text-sm font-medium border ${form.theme === t ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300" : "border-white/10 text-white/60"}`}>
                {t === "warm" ? "Warm & appetizing" : "Dark cyber"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="overline">Accent</label>
            <input type="color" value={form.accent_color} onChange={(e)=>setForm({...form,accent_color:e.target.value})} data-testid="profile-accent" className="w-14 h-9 rounded-md border border-white/10 bg-transparent" />
            <span className="mono text-xs text-white/40">{form.accent_color}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="cyber-card p-6">
          <div className="overline mb-3">Status</div>
          <button onClick={()=>setForm({...form, is_open: !form.is_open})} data-testid="profile-open-toggle" className={`w-full py-3 rounded-md text-sm font-medium border ${form.is_open ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
            {form.is_open ? "Open — accepting orders" : "Closed"}
          </button>
        </div>
        <button onClick={save} disabled={saving} data-testid="profile-save-btn" className="cyber-btn w-full justify-center">
          <Check size={16} weight="bold" /> {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

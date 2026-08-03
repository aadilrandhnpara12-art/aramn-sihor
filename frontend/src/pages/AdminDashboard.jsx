import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import DashNav from "../components/layout/DashNav";
import { toast } from "sonner";
import { Users, Storefront, ShoppingCart, QrCode, Prohibit, ArrowsClockwise, Trash, ArrowSquareOut, Package, PencilSimple, Plus, X, Check, Sparkle } from "@phosphor-icons/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PLAN_COLORS = { free: "#9B968D", starter: "#0F766E", premium: "#C2410C", business: "#0F0E0C" };

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="card-editorial p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="overline">{label}</div>
        <Icon size={18} weight="regular" className="text-clay-600" />
      </div>
      <div className="display text-4xl font-semibold text-ink-900">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    if (user === false) nav("/login");
    else if (user && user.role !== "admin") nav("/dashboard");
  }, [user, nav]);

  const load = async () => {
    try {
      const [s, u, p] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users"), api.get("/admin/plans")]);
      setStats(s.data); setUsers(u.data); setPlans(p.data);
    } catch {}
  };
  useEffect(() => { if (user?.role === "admin") load(); }, [user?.role]);

  const setPlan = async (u, plan) => {
    try { await api.patch(`/admin/users/${u.user_id}/plan`, { plan, days: 30 }); toast.success(`Plan → ${plan}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const setStatus = async (u, status) => {
    try { await api.patch(`/admin/users/${u.user_id}/status`, { status }); toast.success(`User ${status}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (u) => {
    if (!confirm(`Delete ${u.email}?`)) return;
    try { await api.delete(`/admin/users/${u.user_id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!user || user === false || !stats) {
    return (
      <div className="min-h-screen bg-ink-50 grid place-items-center">
        <div className="w-12 h-12 border-2 border-clay-200 border-t-clay-600 rounded-full animate-spin" />
      </div>
    );
  }

  const planData = Object.entries(stats.plans || {}).map(([k, v]) => ({ name: k, value: v, color: PLAN_COLORS[k] || "#9B968D" }));

  return (
    <div className="min-h-screen bg-ink-50">
      <DashNav title="Super admin" />
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="overline text-clay-600">Command Center</div>
            <h1 className="display font-semibold text-4xl text-ink-900 mt-1">Platform overview</h1>
            <div className="text-ink-500 mono text-xs mt-2">Signed in as {user.email}</div>
          </div>
          <div className="flex gap-2">
            <div className="p-1 bg-white border border-ink-200 rounded-full flex gap-1">
              {[
                { id: "overview", label: "Overview", icon: Users },
                { id: "users", label: "Restaurants", icon: Storefront },
                { id: "plans", label: "Plans", icon: Package },
              ].map((t) => (
                <button key={t.id} onClick={()=>setTab(t.id)} data-testid={`admin-tab-${t.id}`} className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${tab === t.id ? "bg-ink-900 text-white" : "text-ink-600 hover:text-ink-900"}`}>
                  <t.icon size={13} weight="regular" /> {t.label}
                </button>
              ))}
            </div>
            <button onClick={load} className="btn-ghost text-sm" data-testid="admin-refresh"><ArrowsClockwise size={14} weight="bold" /></button>
          </div>
        </div>

        {tab === "overview" && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Restaurant owners" value={stats.users} icon={Users} />
              <StatCard label="Restaurants" value={stats.restaurants} icon={Storefront} />
              <StatCard label="Orders" value={stats.orders} icon={ShoppingCart} />
              <StatCard label="QR scans" value={stats.scans} icon={QrCode} />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="card-editorial p-6">
                <div className="overline mb-4">Plan distribution</div>
                {planData.length === 0 ? (
                  <div className="text-ink-500 text-sm py-8 text-center">No owner data yet.</div>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={planData} innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={4}>
                          {planData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E8E2D5", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="lg:col-span-2 card-editorial p-6">
                <div className="overline mb-4">Latest owners</div>
                {users.length === 0 ? (
                  <div className="text-ink-500 text-sm py-8 text-center">No owners yet.</div>
                ) : (
                  <div className="divide-y divide-ink-200">
                    {users.slice(0, 6).map((u) => (
                      <div key={u.user_id} className="py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-clay-100 border border-clay-200 grid place-items-center text-clay-700 text-sm font-semibold display">{(u.name || "?").slice(0,1).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-ink-900 text-sm truncate">{u.name} <span className="text-ink-500">· {u.email}</span></div>
                          <div className="text-ink-500 text-xs mono truncate">{u.restaurant_name || "—"}</div>
                        </div>
                        <span className="pill capitalize" style={{ background: `${PLAN_COLORS[u.plan] || "#9B968D"}18`, color: PLAN_COLORS[u.plan] || "#5A544A" }}>{u.plan}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="card-editorial p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="overline">All restaurant owners</div>
                <div className="text-ink-500 text-sm">{users.length} total</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-ink-200">
                    <th className="py-3 font-medium">Owner</th>
                    <th className="py-3 font-medium">Restaurant</th>
                    <th className="py-3 font-medium">Plan</th>
                    <th className="py-3 font-medium">Status</th>
                    <th className="py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {users.map((u) => (
                    <tr key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                      <td className="py-4"><div className="text-ink-900 font-medium">{u.name}</div><div className="text-ink-500 text-xs mono">{u.email}</div></td>
                      <td className="py-4">{u.restaurant_slug ? <a href={`/r/${u.restaurant_slug}`} target="_blank" rel="noreferrer" className="btn-link text-sm">{u.restaurant_name} <ArrowSquareOut size={11} className="inline ml-1" /></a> : <span className="text-ink-400">—</span>}</td>
                      <td className="py-4">
                        <select value={u.plan || "free"} onChange={(e)=>setPlan(u, e.target.value)} data-testid={`plan-select-${u.user_id}`} className="input-field !py-1.5 !px-2 text-xs capitalize">
                          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="py-4"><span className={`pill ${u.status === "suspended" ? "bg-red-50 text-red-700" : "bg-moss-50 text-moss-700"}`}>{u.status || "active"}</span></td>
                      <td className="py-4 text-right">
                        <div className="inline-flex gap-3 text-xs">
                          {u.status === "suspended" ? <button onClick={()=>setStatus(u, "active")} className="text-moss-700 hover:text-moss-600" data-testid={`activate-${u.user_id}`}>Activate</button> : <button onClick={()=>setStatus(u, "suspended")} className="text-amber-700 hover:text-amber-600" data-testid={`suspend-${u.user_id}`}>Suspend</button>}
                          <button onClick={()=>del(u)} className="text-red-600 hover:text-red-500" data-testid={`delete-${u.user_id}`}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "plans" && <PlansTab plans={plans} reload={load} />}
      </div>
    </div>
  );
}

function PlansTab({ plans, reload }) {
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Subscription plans</div>
          <div className="text-ink-500 text-sm">Edit prices, features, and popularity of what customers see on the pricing page.</div>
        </div>
        <button onClick={()=>setCreating(true)} data-testid="admin-create-plan-btn" className="btn-accent text-sm"><Plus size={14} weight="bold" /> New plan</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div key={p.id} className={`relative rounded-2xl p-6 flex flex-col ${p.popular ? "bg-ink-900 text-ink-50 border border-ink-900" : "card-editorial"}`} data-testid={`admin-plan-${p.id}`}>
            {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 pill bg-clay-600 text-white text-xs"><Sparkle size={11} weight="fill" /> Popular</div>}
            <div className="flex items-start justify-between">
              <div>
                <div className="display font-semibold text-lg">{p.name}</div>
                <div className="mono text-xs opacity-60 mt-0.5">/{p.id}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={()=>setEditing(p)} data-testid={`admin-plan-edit-${p.id}`} className={`w-7 h-7 rounded-md border ${p.popular ? "border-ink-700 hover:border-white text-ink-300" : "border-ink-200 hover:border-ink-900 text-ink-600"} grid place-items-center`}><PencilSimple size={12} /></button>
                {p.id !== "free" && (
                  <button onClick={async () => { if (confirm(`Delete plan ${p.name}?`)) { await api.delete(`/admin/plans/${p.id}`); toast.success("Deleted"); reload(); } }} data-testid={`admin-plan-del-${p.id}`} className={`w-7 h-7 rounded-md border ${p.popular ? "border-ink-700 hover:border-red-400 text-ink-300 hover:text-red-400" : "border-ink-200 hover:border-red-500 text-ink-600 hover:text-red-500"} grid place-items-center`}><Trash size={12} /></button>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="mono text-3xl font-bold">₹{p.price}</span>
              <span className={p.popular ? "text-ink-400 text-sm" : "text-ink-500 text-sm"}>/{p.period}</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm flex-1">
              {(p.features || []).map((f, i) => <li key={i} className="flex gap-2"><Check size={13} weight="bold" className={p.popular ? "text-clay-400 mt-0.5 shrink-0" : "text-clay-600 mt-0.5 shrink-0"} /><span className={p.popular ? "text-ink-100" : "text-ink-700"}>{f}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
      {(editing || creating) && <PlanEditor plan={editing} isNew={creating} onClose={()=>{ setEditing(null); setCreating(false); }} onSaved={()=>{ setEditing(null); setCreating(false); reload(); }} />}
    </div>
  );
}

function PlanEditor({ plan, isNew, onClose, onSaved }) {
  const [form, setForm] = useState(plan || { id: "", name: "", price: 0, period: "month", features: [], cta: "Pay via WhatsApp", popular: false, order: 99 });
  const [feature, setFeature] = useState("");
  const [saving, setSaving] = useState(false);

  const addFeature = () => { if (!feature.trim()) return; setForm({ ...form, features: [...(form.features||[]), feature.trim()] }); setFeature(""); };
  const removeFeature = (i) => setForm({ ...form, features: form.features.filter((_, idx) => idx !== i) });

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, order: parseInt(form.order) || 99 };
      if (isNew) await api.post("/admin/plans", payload);
      else await api.patch(`/admin/plans/${plan.id}`, payload);
      toast.success(isNew ? "Plan created" : "Plan updated");
      onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 border border-ink-200 p-8" data-testid="plan-editor">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="overline mb-1">{isNew ? "New plan" : `Edit ${plan.name}`}</div>
            <h3 className="display text-2xl font-semibold text-ink-900">Plan details</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="overline block mb-2">ID (slug)</label>
              <input disabled={!isNew} data-testid="plan-id" className="input-field mono" value={form.id} onChange={(e)=>setForm({...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")})} />
            </div>
            <div>
              <label className="overline block mb-2">Name</label>
              <input data-testid="plan-name" className="input-field" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="overline block mb-2">Price (₹)</label>
              <input type="number" step="1" data-testid="plan-price" className="input-field mono" value={form.price} onChange={(e)=>setForm({...form, price: e.target.value})} />
            </div>
            <div>
              <label className="overline block mb-2">Period</label>
              <select className="input-field" value={form.period} onChange={(e)=>setForm({...form, period: e.target.value})} data-testid="plan-period">
                <option value="forever">forever</option>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </div>
            <div>
              <label className="overline block mb-2">Sort order</label>
              <input type="number" className="input-field mono" value={form.order} onChange={(e)=>setForm({...form, order: e.target.value})} data-testid="plan-order" />
            </div>
          </div>
          <div>
            <label className="overline block mb-2">CTA button label</label>
            <input className="input-field" value={form.cta} onChange={(e)=>setForm({...form, cta: e.target.value})} data-testid="plan-cta" />
          </div>
          <div>
            <label className="overline block mb-2">Features</label>
            <div className="flex gap-2 mb-2">
              <input placeholder="e.g. Unlimited menu items" value={feature} onChange={(e)=>setFeature(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();addFeature();}}} className="input-field" data-testid="plan-feature-input" />
              <button onClick={addFeature} type="button" data-testid="plan-feature-add" className="btn-primary text-sm">Add</button>
            </div>
            <div className="space-y-1.5">
              {(form.features || []).map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-md">
                  <Check size={13} weight="bold" className="text-clay-600" />
                  <span className="flex-1 text-sm text-ink-800">{f}</span>
                  <button onClick={()=>removeFeature(i)} className="text-ink-400 hover:text-red-500" data-testid={`plan-feature-del-${i}`}><X size={12} /></button>
                </div>
              ))}
              {(form.features || []).length === 0 && <div className="text-xs text-ink-400 py-2">No features yet.</div>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer pt-2">
            <input type="checkbox" checked={!!form.popular} onChange={(e)=>setForm({...form, popular: e.target.checked})} className="accent-clay-600" data-testid="plan-popular" />
            Mark as "Most popular" (highlighted on pricing page)
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t border-ink-200 mt-6">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-accent text-sm" data-testid="plan-save-btn">
            <Check size={14} weight="bold" /> {saving ? "Saving..." : "Save plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

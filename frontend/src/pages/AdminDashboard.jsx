import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import DashNav from "../components/layout/DashNav";
import { toast } from "sonner";
import { Users, Storefront, ShoppingCart, QrCode, Prohibit, ArrowsClockwise, Trash, ArrowSquareOut } from "@phosphor-icons/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PLAN_COLORS = { free: "#71717A", starter: "#00F0FF", premium: "#D946EF", business: "#F97316" };

function StatCard({ label, value, icon: Icon, tint = "cyan" }) {
  return (
    <div className="cyber-card p-6 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${tint === "cyan" ? "bg-cyan-500/15" : "bg-fuchsia-500/15"}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="overline">{label}</div>
          <Icon size={18} weight="duotone" className={tint === "cyan" ? "text-cyan-300" : "text-fuchsia-300"} />
        </div>
        <div className="mono text-4xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (user === false) nav("/login");
    else if (user && user.role !== "admin") nav("/dashboard");
  }, [user, nav]);

  const load = async () => {
    try {
      const [s, u] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users")]);
      setStats(s.data);
      setUsers(u.data);
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { if (user?.role === "admin") load(); }, [user?.role]);

  const setPlan = async (u, plan) => {
    try { await api.patch(`/admin/users/${u.user_id}/plan`, { plan, days: 30 }); toast.success(`Plan updated to ${plan}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const setStatus = async (u, status) => {
    try { await api.patch(`/admin/users/${u.user_id}/status`, { status }); toast.success(`User ${status}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (u) => {
    if (!confirm(`Delete ${u.email} and all their data?`)) return;
    try { await api.delete(`/admin/users/${u.user_id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!user || user === false || !stats) {
    return (
      <div className="cyber-bg min-h-screen grid place-items-center">
        <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  const planData = Object.entries(stats.plans || {}).map(([k, v]) => ({ name: k, value: v, color: PLAN_COLORS[k] || "#71717A" }));

  return (
    <div className="cyber-bg cyber-noise min-h-screen">
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none" />
      <DashNav title="Super admin" />
      <div className="relative max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="overline text-fuchsia-300">Command Center</div>
            <h1 className="font-display font-bold text-4xl text-white tracking-tight mt-1">Platform overview</h1>
            <div className="text-white/40 mono text-xs uppercase tracking-widest mt-2">Signed in as {user.email}</div>
          </div>
          <button onClick={load} className="cyber-btn-ghost text-sm" data-testid="admin-refresh"><ArrowsClockwise size={14} weight="bold" /> Refresh</button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Restaurant owners" value={stats.users} icon={Users} />
          <StatCard label="Restaurants" value={stats.restaurants} icon={Storefront} tint="fuchsia" />
          <StatCard label="Orders" value={stats.orders} icon={ShoppingCart} />
          <StatCard label="QR scans" value={stats.scans} icon={QrCode} tint="fuchsia" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 cyber-card p-6">
            <div className="overline mb-4">Plan distribution</div>
            {planData.length === 0 ? (
              <div className="text-white/40 text-sm py-8 text-center">No owner data yet.</div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={planData} innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={4}>
                      {planData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0F0F16", border: "1px solid #27273A", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 space-y-1">
              {planData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-white/70 capitalize">{p.name}</span>
                  </div>
                  <span className="mono text-white/50">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 cyber-card p-6">
            <div className="overline mb-4">Latest owners</div>
            {users.length === 0 ? (
              <div className="text-white/40 text-sm py-8 text-center">No owners yet. Waiting for signups…</div>
            ) : (
              <div className="divide-y divide-white/5">
                {users.slice(0, 5).map((u) => (
                  <div key={u.user_id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 grid place-items-center text-white text-sm font-semibold">
                      {(u.name || "?").slice(0,1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{u.name} <span className="text-white/40">· {u.email}</span></div>
                      <div className="text-white/40 text-xs mono truncate">{u.restaurant_name || "—"}</div>
                    </div>
                    <span className={`warm-pill text-xs capitalize`} style={{ background: `${PLAN_COLORS[u.plan] || "#71717A"}20`, color: PLAN_COLORS[u.plan] || "#71717A", border: `1px solid ${PLAN_COLORS[u.plan] || "#71717A"}40` }}>
                      {u.plan}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="cyber-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="overline">All restaurant owners</div>
              <div className="text-white/50 text-sm">{users.length} total</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="py-3 font-medium">Owner</th>
                  <th className="py-3 font-medium">Restaurant</th>
                  <th className="py-3 font-medium">Plan</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                    <td className="py-3">
                      <div className="text-white">{u.name}</div>
                      <div className="text-white/40 text-xs mono">{u.email}</div>
                    </td>
                    <td className="py-3">
                      {u.restaurant_slug ? (
                        <a href={`/r/${u.restaurant_slug}`} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline flex items-center gap-1">
                          {u.restaurant_name} <ArrowSquareOut size={12} />
                        </a>
                      ) : <span className="text-white/40">—</span>}
                    </td>
                    <td className="py-3">
                      <select value={u.plan || "free"} onChange={(e)=>setPlan(u, e.target.value)} data-testid={`plan-select-${u.user_id}`} className="cyber-input !py-1.5 !px-2 text-xs capitalize">
                        <option value="free" className="bg-black">Free</option>
                        <option value="starter" className="bg-black">Starter</option>
                        <option value="premium" className="bg-black">Premium</option>
                        <option value="business" className="bg-black">Business</option>
                      </select>
                    </td>
                    <td className="py-3">
                      <span className={`warm-pill text-xs ${u.status === "suspended" ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-green-500/15 text-green-400 border border-green-500/30"}`}>
                        {u.status || "active"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        {u.status === "suspended" ? (
                          <button onClick={()=>setStatus(u, "active")} className="text-green-400 hover:text-green-300 text-xs" data-testid={`activate-${u.user_id}`}>Activate</button>
                        ) : (
                          <button onClick={()=>setStatus(u, "suspended")} className="text-yellow-400 hover:text-yellow-300 text-xs flex items-center gap-1" data-testid={`suspend-${u.user_id}`}><Prohibit size={12} /> Suspend</button>
                        )}
                        <button onClick={()=>del(u)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1" data-testid={`delete-${u.user_id}`}><Trash size={12} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

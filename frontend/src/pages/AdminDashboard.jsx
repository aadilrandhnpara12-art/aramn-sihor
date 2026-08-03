import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import DashNav from "../components/layout/DashNav";
import { toast } from "sonner";
import { Users, Storefront, ShoppingCart, QrCode, Prohibit, ArrowsClockwise, Trash, ArrowSquareOut } from "@phosphor-icons/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PLAN_COLORS = { free: "#9B968D", starter: "#0F766E", premium: "#C2410C", business: "#0F0E0C" };

function StatCard({ label, value, icon: Icon, delta }) {
  return (
    <div className="card-editorial p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="overline">{label}</div>
        <Icon size={18} weight="regular" className="text-clay-600" />
      </div>
      <div className="display text-4xl font-semibold text-ink-900">{value}</div>
      {delta && <div className="text-xs text-ink-500 mt-1">{delta}</div>}
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
    } catch (e) {}
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
          <button onClick={load} className="btn-ghost text-sm" data-testid="admin-refresh"><ArrowsClockwise size={14} weight="bold" /> Refresh</button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Restaurant owners" value={stats.users} icon={Users} />
          <StatCard label="Restaurants" value={stats.restaurants} icon={Storefront} />
          <StatCard label="Orders" value={stats.orders} icon={ShoppingCart} />
          <StatCard label="QR scans" value={stats.scans} icon={QrCode} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
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
            <div className="mt-4 space-y-1">
              {planData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-ink-700 capitalize">{p.name}</span>
                  </div>
                  <span className="mono text-ink-500">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 card-editorial p-6">
            <div className="overline mb-4">Latest owners</div>
            {users.length === 0 ? (
              <div className="text-ink-500 text-sm py-8 text-center">No owners yet.</div>
            ) : (
              <div className="divide-y divide-ink-200">
                {users.slice(0, 6).map((u) => (
                  <div key={u.user_id} className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-clay-100 border border-clay-200 grid place-items-center text-clay-700 text-sm font-semibold display">
                      {(u.name || "?").slice(0,1).toUpperCase()}
                    </div>
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
                    <td className="py-4">
                      <div className="text-ink-900 font-medium">{u.name}</div>
                      <div className="text-ink-500 text-xs mono">{u.email}</div>
                    </td>
                    <td className="py-4">
                      {u.restaurant_slug ? (
                        <a href={`/r/${u.restaurant_slug}`} target="_blank" rel="noreferrer" className="btn-link text-sm">
                          {u.restaurant_name} <ArrowSquareOut size={11} className="inline ml-1" />
                        </a>
                      ) : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="py-4">
                      <select value={u.plan || "free"} onChange={(e)=>setPlan(u, e.target.value)} data-testid={`plan-select-${u.user_id}`} className="input-field !py-1.5 !px-2 text-xs capitalize">
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="premium">Premium</option>
                        <option value="business">Business</option>
                      </select>
                    </td>
                    <td className="py-4">
                      <span className={`pill ${u.status === "suspended" ? "bg-red-50 text-red-700" : "bg-moss-50 text-moss-700"}`}>{u.status || "active"}</span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex gap-3 text-xs">
                        {u.status === "suspended" ? (
                          <button onClick={()=>setStatus(u, "active")} className="text-moss-700 hover:text-moss-600" data-testid={`activate-${u.user_id}`}>Activate</button>
                        ) : (
                          <button onClick={()=>setStatus(u, "suspended")} className="text-amber-700 hover:text-amber-600" data-testid={`suspend-${u.user_id}`}>Suspend</button>
                        )}
                        <button onClick={()=>del(u)} className="text-red-600 hover:text-red-500" data-testid={`delete-${u.user_id}`}>Delete</button>
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

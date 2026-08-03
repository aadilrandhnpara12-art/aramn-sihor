import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SignOut, Storefront, ArrowSquareOut } from "@phosphor-icons/react";

export default function DashNav({ title, slug }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-50/85 border-b border-ink-200">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2" data-testid="dash-logo">
            <div className="w-8 h-8 rounded-lg bg-ink-900 grid place-items-center"><span className="mono text-ink-50 font-bold text-sm">M</span></div>
            <span className="display font-semibold text-ink-900">Menu<span className="text-clay-600">Maker</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Storefront size={14} className="text-ink-400" />
            <span className="text-ink-600 text-xs uppercase tracking-widest">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {slug && (
            <a
              href={`/r/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs !py-1.5 !px-3"
              data-testid="dash-preview-menu"
            >
              <ArrowSquareOut size={12} weight="bold" /> Preview menu
            </a>
          )}
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-ink-200">
            <div className="w-8 h-8 rounded-full bg-clay-100 border border-clay-200 grid place-items-center text-clay-700 text-xs font-semibold display" data-testid="dash-user-avatar">
              {(user?.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="text-xs">
              <div className="text-ink-900 font-medium">{user?.name}</div>
              <div className="text-ink-500 mono">{user?.role}</div>
            </div>
          </div>
          <button onClick={async () => { await logout(); nav("/login"); }} className="btn-ghost text-xs !py-1.5 !px-3" data-testid="dash-logout">
            <SignOut size={12} weight="bold" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

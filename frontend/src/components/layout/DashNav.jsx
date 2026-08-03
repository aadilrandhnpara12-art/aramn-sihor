import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SignOut, Storefront, ArrowSquareOut } from "@phosphor-icons/react";

export default function DashNav({ title, slug }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/60 border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2" data-testid="dash-logo">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 grid place-items-center font-bold text-black text-sm">M</div>
            <span className="font-display font-semibold text-white">Menu<span className="text-cyan-400">Maker</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <Storefront size={16} className="text-white/40" />
            <span className="text-white/60 mono uppercase tracking-widest text-xs">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {slug && (
            <a
              href={`/r/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="cyber-btn-ghost text-xs !py-2 !px-3"
              data-testid="dash-preview-menu"
            >
              <ArrowSquareOut size={14} weight="bold" /> Preview menu
            </a>
          )}
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center text-white text-xs font-semibold" data-testid="dash-user-avatar">
              {(user?.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="text-xs">
              <div className="text-white">{user?.name}</div>
              <div className="text-white/40 mono">{user?.role}</div>
            </div>
          </div>
          <button onClick={async () => { await logout(); nav("/login"); }} className="cyber-btn-ghost text-xs !py-2 !px-3" data-testid="dash-logout">
            <SignOut size={14} weight="bold" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

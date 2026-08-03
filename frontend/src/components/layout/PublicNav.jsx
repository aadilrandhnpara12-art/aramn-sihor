import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { List, X } from "@phosphor-icons/react";

const links = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
];

export default function PublicNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-50/80 border-b border-ink-200/70">
      <div className="container-editorial h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-ink-900 grid place-items-center">
            <span className="mono text-ink-50 font-bold text-sm">M</span>
          </div>
          <span className="display text-xl font-semibold text-ink-900 tracking-tight">
            Menu<span className="text-clay-600">Maker</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {links.map((l) => (
            <Link
              key={l.to} to={l.to}
              data-testid={`nav-${l.label.toLowerCase()}`}
              className={`text-sm font-medium transition-colors ${
                pathname === l.to ? "text-clay-600" : "text-ink-700 hover:text-ink-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && user.user_id ? (
            <Link
              to={user.role === "admin" ? "/admin" : "/dashboard"}
              className="btn-primary text-sm !py-2"
              data-testid="nav-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-login"
                className="hidden sm:inline text-sm font-medium text-ink-700 hover:text-ink-900 mr-3"
              >
                Sign in
              </Link>
              <Link to="/register" data-testid="nav-cta-signup" className="btn-accent text-sm !py-2">
                Start free
              </Link>
            </>
          )}
          <button className="md:hidden ml-2 w-9 h-9 grid place-items-center text-ink-700" onClick={() => setOpen(!open)} data-testid="nav-menu-toggle">
            {open ? <X size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-ink-200 bg-ink-50 py-4">
          <div className="container-editorial flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-ink-700 text-sm font-medium py-1">{l.label}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

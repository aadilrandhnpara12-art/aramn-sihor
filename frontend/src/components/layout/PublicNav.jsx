import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
];

export default function PublicNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/60 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 grid place-items-center mono text-black font-bold text-sm">
            M
          </div>
          <span className="font-display font-semibold tracking-tight text-white text-lg">
            Menu<span className="text-cyan-400">Maker</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase()}`}
              className={`text-sm font-medium transition-colors ${
                pathname === l.to ? "text-cyan-400" : "text-white/70 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user && user.user_id ? (
            <Link
              to={user.role === "admin" ? "/admin" : "/dashboard"}
              className="cyber-btn text-sm"
              data-testid="nav-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-login"
                className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link to="/register" data-testid="nav-cta-signup" className="cyber-btn text-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

# MenuMaker SaaS — PRD

## Original problem statement
Build a premium, production-ready SaaS called Menu Maker for Restaurants, Cafes, Hotels, Fast Food Shops, Bakeries and Cloud Kitchens. Platform owner is a Digital QR Menu Seller. Three roles: Super Admin, Restaurant Owner, Customer (no login). Features: menu CRUD, QR codes, WhatsApp ordering, subscriptions, analytics, coupons, multi-language, themes.

## User choices (locked)
- Stack: React + FastAPI + MongoDB
- Auth: JWT email/password + Emergent Google Social Login
- Payments: Skip for MVP / manual activation by admin (Stripe not supported in IN)
- AI descriptions: Emergent LLM key with Claude Sonnet 4.6
- Image uploads: Emergent Object Storage

## Personas
1. **Super Admin (aadilrandhnpara12@gmail.com)** — platform owner, sees all restaurants, plans, analytics; can suspend/delete/activate owners and change plans.
2. **Restaurant Owner** — signs up, manages menu, QR, tables, orders, analytics, branding, theme, WhatsApp number, business hours.
3. **Customer** — scans QR, browses menu, adds to cart, sends order to restaurant WhatsApp.

## Implemented (2026-02-03)
### Backend (FastAPI + MongoDB)
- JWT auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- Emergent Google Auth: `/api/auth/google/session` (session_id exchange)
- Admin seeded on startup with env creds. Idempotent (updates password from env).
- Owner shell restaurant auto-created on signup with unique slug.
- CRUD: categories, menu items (name, image, price, veg, bestseller, spicy_level, available), tables.
- Restaurant profile PATCH (branding, hours, whatsapp, google map, theme, currency, is_open).
- Public: `GET /api/public/restaurant/{slug}` (menu + logs QR scan), `POST /api/public/orders` (creates order + returns WhatsApp URL).
- Uploads: `POST /api/upload` → Emergent Object Storage. `GET /api/files/{path}` streams file.
- AI: `POST /api/ai/describe` → Claude Sonnet 4.6 via emergentintegrations.
- Analytics owner: scans, orders, items, categories, tables, 7-day trend, popular items.
- Admin: `/api/admin/stats`, `/api/admin/users`, PATCH plan, PATCH status, DELETE user (cascade).
- Plans catalog: `/api/plans` (Free/Starter/Premium/Business).

### Frontend (React)
- Marketing: Landing (cyberpunk hero + QR card), Features, Pricing (4 tiers), Contact.
- Auth: Login (email/password + Google), Register, Forgot Password prompt, Auth Callback for Google.
- Owner Dashboard: Menu (categories sidebar + item cards with badges/photos), QR & Tables (QR preview with PNG/SVG download + table QRs), Orders, Analytics (recharts line + popular), Restaurant profile (branding, hours, WhatsApp, theme, currency).
- Admin Dashboard: KPI cards, plan distribution pie, users table with plan selector + suspend/activate/delete actions.
- Public Menu: Mobile-first warm theme with banner, logo, badges (veg/non-veg/spicy/bestseller), search, category strip, cart drawer, WhatsApp checkout with formatted order message.
- Design: Dual aesthetic — cyber dark for platform/dashboards, warm serif menu for customer-facing menu. Fraunces + Outfit + JetBrains Mono + IBM Plex Sans.

### Tests
- 26/26 backend tests passing (auth, CRUD, public, orders, AI, uploads, admin).

## Deferred (phase 2 backlog)
- Real Stripe subscriptions (currently manual admin activation; Stripe sandbox not available for IN)
- Multi-language menu
- PWA install manifest & service worker
- Custom domain support (Business tier)
- Backup/restore + import/export Excel/PDF
- Customer reviews module
- Coupon / discount codes
- GST / tax settings, delivery charges
- Mobile OTP verification
- Email verification & password reset via Resend
- Support ticket system
- Announcements/notifications
- Drag reorder for categories and items
- Item view counter (currently placeholder)

## Test credentials
See `/app/memory/test_credentials.md`

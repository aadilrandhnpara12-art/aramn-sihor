# MenuMaker SaaS — PRD

## Original problem statement
Build a premium, production-ready SaaS called Menu Maker for Restaurants, Cafes, Hotels, Fast Food Shops, Bakeries and Cloud Kitchens. Three roles: Super Admin, Restaurant Owner, Customer (no login). Features: menu CRUD, QR codes, WhatsApp ordering, subscriptions, analytics, coupons, multi-language, themes.

## User choices
- Stack: React + FastAPI + MongoDB
- Auth: JWT email/password + Emergent Google Social Login
- Payments: Skip Stripe (India unsupported) — plans mark manually by admin
- AI descriptions: Emergent LLM key with Claude Sonnet 4.6
- Images: Emergent Object Storage
- Design (v2): Modern editorial — warm off-white palette, Fraunces + Inter typography, burnt orange accent (replaced cyber theme)

## Personas
1. **Super Admin (aadilrandhnpara12@gmail.com)** — platform owner, sees all restaurants, plans, analytics; can suspend/delete/activate owners and change plans.
2. **Restaurant Owner** — signs up, manages menu, QR, tables, orders, coupons, reviews, gallery, analytics, branding, tax/delivery.
3. **Customer** — scans QR, browses menu, applies coupon, adds to cart, chooses order type, sends order to restaurant WhatsApp with computed total (subtotal - discount + GST + service + delivery), leaves review.

## Implemented (2026-02-03, iteration 2)

### Backend (FastAPI + MongoDB, 52/52 tests passing)
- JWT auth: register/login/logout/me/forgot-password/reset-password + Emergent Google session exchange
- Admin seeded on startup, idempotent
- CRUD: categories, menu items, tables, restaurant profile
- Object Storage uploads (multi: logo, banner, item, gallery)
- AI descriptions via Claude Sonnet 4.6
- Analytics owner: scans, orders, items, cats, tables, 7-day trend, popular items
- Admin: stats, users list, PATCH plan, PATCH status, DELETE cascade
- Public: `/api/public/restaurant/{slug}` returns menu + categories + items + reviews_summary; logs QR scan
- Public orders: POST creates order with **coupon, GST, service charge, delivery fee**; validates min_order and is_open; returns WhatsApp URL with formatted receipt
- **Coupons**: full CRUD, active toggle, public validation endpoint (`GET /api/public/coupons/{slug}/{code}?subtotal=N`)
- **Reviews**: public POST review (1-5 stars), public GET reviews list + average + count, owner list
- **Order status**: PATCH /api/orders/{id} for status transitions (sent → preparing → ready → delivered/cancelled)
- **Restaurant profile fields (new)**: about_us, gst_percent, service_charge_percent, delivery_charge, min_order, offer_banner + active toggle, gallery (list of URLs), accept_dine_in/takeaway/delivery

### Frontend (React)
- Marketing site (Modern editorial):
  - Landing — hero with restaurant/italic serif headline, phone mockup + floating QR, stats strip, marquee, how-it-works, feature bento (dark card + light cards mix), testimonials (dark section), FAQ accordion, final CTA (clay orange section)
  - Pricing — 4 tiers with Premium highlighted dark
  - Features — 4 category groups × 4 cards = 16 features
  - Contact — form + hello@ / live chat cards
- Auth: split-screen Login + Register with editorial testimonial/features side panel
- Owner Dashboard tabs (7): **Menu, QR & Tables, Orders (with status filters), Coupons, Reviews, Analytics, Restaurant (with tax/fees, offer banner, gallery, about us, order types)**
- Admin Dashboard: KPI cards, plan pie, latest owners, full users table with plan/status/delete
- Public Menu (warm serif theme): offer banner top bar, review pill, gallery sheet, about us block, cart drawer with order type selector + delivery address + coupon input + itemised total breakdown, review submission sheet

### PWA
- manifest.json added (theme_color, background_color, standalone)

## Deferred
- Real payment integration (Stripe unavailable in IN; Razorpay backlog)
- Business hours automatic enforcement (currently manual is_open toggle)
- Multi-language menu (i18n toggle)
- Import/export Excel/PDF
- Backup/restore
- Support tickets system
- Announcements/notifications
- Email verification + Mobile OTP
- Push notifications for new orders
- Drag reorder for categories and items
- Coupon expiry dates / usage limits
- Custom domain

## Test credentials
See `/app/memory/test_credentials.md`

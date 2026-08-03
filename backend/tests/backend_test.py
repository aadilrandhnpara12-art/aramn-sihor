"""Backend API tests for Restaurant Digital QR Menu Maker SaaS."""
import os
import io
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1]
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "aadilrandhnpara12@gmail.com"
ADMIN_PASSWORD = "Admin@12345"


@pytest.fixture(scope="session")
def admin_client():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="session")
def owner_ctx():
    """Register a fresh owner + return session and info."""
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_owner_{unique}@example.com"
    password = "OwnerPass123!"
    name = f"TEST Owner {unique}"
    rname = f"TEST Diner {unique}"
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": password, "name": name, "restaurant_name": rname,
    })
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    # Pre-configure restaurant with whatsapp so WhatsApp URL is generated in public order tests
    s.patch(f"{API}/restaurant/me", json={
        "whatsapp": "+911234567890", "phone": "+911234567890",
    })
    return {
        "session": s, "email": email, "password": password, "name": name,
        "restaurant_name": rname, "slug": data["restaurant_slug"],
        "user_id": data["user_id"], "token": tok,
    }


# ---------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Plans catalog ----------
class TestPlans:
    def test_plans(self):
        r = requests.get(f"{API}/plans")
        assert r.status_code == 200
        plans = r.json()
        assert isinstance(plans, list) and len(plans) == 4
        ids = {p["id"] for p in plans}
        assert ids == {"free", "starter", "premium", "business"}


# ---------- Admin auth ----------
class TestAdminAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "token" in j and j["role"] == "admin"
        # cookie set
        assert "access_token" in r.cookies

    def test_admin_me(self, admin_client):
        r = admin_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401


# ---------- Owner register / login / me ----------
class TestOwnerAuth:
    def test_owner_register_creates_restaurant(self, owner_ctx):
        assert owner_ctx["slug"]
        r = owner_ctx["session"].get(f"{API}/auth/me")
        assert r.status_code == 200
        me = r.json()
        assert me["role"] == "owner"
        assert me["restaurant_slug"] == owner_ctx["slug"]

    def test_owner_login(self, owner_ctx):
        r = requests.post(f"{API}/auth/login", json={
            "email": owner_ctx["email"], "password": owner_ctx["password"],
        })
        assert r.status_code == 200
        assert r.json()["role"] == "owner"

    def test_duplicate_email(self, owner_ctx):
        r = requests.post(f"{API}/auth/register", json={
            "email": owner_ctx["email"], "password": "xx", "name": "dup",
        })
        assert r.status_code == 400


# ---------- Forgot / Reset Password ----------
class TestPasswordReset:
    def test_forgot_and_reset(self, owner_ctx, caplog):
        import logging
        # Trigger forgot-password; server logs the token. We need to fetch it from db via admin? No, use logs
        # simplest: use api call and then read backend logs file
        r = requests.post(f"{API}/auth/forgot-password", json={"email": owner_ctx["email"]})
        assert r.status_code == 200
        time.sleep(1)
        email_lc = owner_ctx["email"].lower()
        token = None
        for path in ("/var/log/supervisor/backend.err.log", "/var/log/supervisor/backend.out.log"):
            try:
                with open(path, "r", errors="ignore") as f:
                    lines = f.readlines()[-2000:]
                for line in reversed(lines):
                    if f"[PASSWORD RESET] user={email_lc}" in line:
                        token = line.split("token=")[-1].strip()
                        break
                if token:
                    break
            except Exception:
                pass
        assert token, "Reset token not found in logs"

        new_pw = "NewOwnerPass456!"
        r = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": new_pw})
        assert r.status_code == 200, r.text

        # login with new password
        r = requests.post(f"{API}/auth/login", json={
            "email": owner_ctx["email"], "password": new_pw,
        })
        assert r.status_code == 200
        # restore original for later tests
        # find token again
        r2 = requests.post(f"{API}/auth/forgot-password", json={"email": owner_ctx["email"]})
        time.sleep(1)
        token2 = None
        with open("/var/log/supervisor/backend.err.log", "r", errors="ignore") as f:
            lines = f.readlines()[-2000:]
        for line in reversed(lines):
            if f"[PASSWORD RESET] user={email_lc}" in line:
                token2 = line.split("token=")[-1].strip()
                break
        if token2:
            requests.post(f"{API}/auth/reset-password", json={
                "token": token2, "new_password": owner_ctx["password"],
            })


# ---------- Owner CRUD ----------
class TestOwnerCRUD:
    def test_restaurant_patch(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.patch(f"{API}/restaurant/me", json={
            "tagline": "Best in town", "whatsapp": "+911234567890", "phone": "+911234567890",
        })
        assert r.status_code == 200
        j = r.json()
        assert j["tagline"] == "Best in town"
        assert j["whatsapp"] == "+911234567890"

    def test_category_crud(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.post(f"{API}/categories", json={"name": "Starters", "order": 1})
        assert r.status_code == 200
        cat = r.json()
        assert cat["name"] == "Starters"
        cid = cat["category_id"]
        owner_ctx["category_id"] = cid

        # list
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        assert any(c["category_id"] == cid for c in r.json())

        # patch
        r = s.patch(f"{API}/categories/{cid}", json={"name": "Appetizers", "order": 2})
        assert r.status_code == 200

    def test_item_crud(self, owner_ctx):
        s = owner_ctx["session"]
        cid = owner_ctx.get("category_id")
        assert cid
        r = s.post(f"{API}/items", json={
            "name": "Paneer Tikka", "description": "", "price": 9.5,
            "category_id": cid, "veg": True, "bestseller": True,
            "spicy_level": 1, "available": True, "order": 0,
        })
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["name"] == "Paneer Tikka"
        iid = item["item_id"]
        owner_ctx["item_id"] = iid

        # list contains
        r = s.get(f"{API}/items")
        assert r.status_code == 200
        assert any(i["item_id"] == iid for i in r.json())

        # patch
        r = s.patch(f"{API}/items/{iid}", json={
            "name": "Paneer Tikka Deluxe", "description": "yum", "price": 10.5,
            "category_id": cid, "veg": True, "bestseller": False, "spicy_level": 2,
            "available": True, "order": 0,
        })
        assert r.status_code == 200

    def test_table_crud(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.post(f"{API}/tables", json={"label": "T1"})
        assert r.status_code == 200
        t = r.json()
        assert t["label"] == "T1"
        owner_ctx["table_id"] = t["table_id"]

        r = s.get(f"{API}/tables")
        assert r.status_code == 200 and len(r.json()) >= 1


# ---------- Public endpoints ----------
class TestPublic:
    def test_public_restaurant(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.get(f"{API}/public/restaurant/{slug}")
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["restaurant"]["slug"] == slug
        assert isinstance(j["categories"], list)
        assert isinstance(j["items"], list)

    def test_public_scan_increments(self, owner_ctx):
        slug = owner_ctx["slug"]
        # get baseline via analytics
        s = owner_ctx["session"]
        r0 = s.get(f"{API}/analytics/owner")
        base = r0.json()["scans"]
        requests.get(f"{API}/public/restaurant/{slug}")
        requests.get(f"{API}/public/restaurant/{slug}?table=T1")
        r1 = s.get(f"{API}/analytics/owner")
        after = r1.json()["scans"]
        assert after >= base + 2

    def test_public_order_with_whatsapp(self, owner_ctx):
        slug = owner_ctx["slug"]
        payload = {
            "restaurant_slug": slug,
            "customer_name": "Alice",
            "customer_phone": "+919999999999",
            "table_number": "T1",
            "notes": "extra spicy",
            "items": [{"item_id": "x", "name": "Paneer Tikka Deluxe", "price": 10.5, "quantity": 2}],
        }
        r = requests.post(f"{API}/public/orders", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["order"]["total"] == 21.0
        assert j["whatsapp_url"] and "wa.me/" in j["whatsapp_url"]

    def test_public_restaurant_404(self):
        r = requests.get(f"{API}/public/restaurant/nonexistent-xyz-12345")
        assert r.status_code == 404


# ---------- Owner Analytics ----------
class TestAnalytics:
    def test_owner_analytics(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.get(f"{API}/analytics/owner")
        assert r.status_code == 200
        j = r.json()
        for k in ("scans", "orders", "items", "categories", "tables", "trend", "popular"):
            assert k in j
        assert isinstance(j["trend"], list) and len(j["trend"]) == 7


# ---------- AI ----------
class TestAI:
    def test_ai_describe(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.post(f"{API}/ai/describe", json={"item_name": "Paneer Tikka", "hints": "spicy Indian appetizer"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "description" in j and len(j["description"]) > 5


# ---------- Upload ----------
class TestUpload:
    def test_upload_and_fetch(self, owner_ctx):
        s = owner_ctx["session"]
        # 1x1 PNG
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        # need to avoid json header for multipart
        s2 = requests.Session()
        s2.headers.update({"Authorization": s.headers["Authorization"]})
        r = s2.post(f"{API}/upload", files=files)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "path" in j and j["url"].startswith("/api/files/")
        # fetch
        r2 = requests.get(f"{BASE_URL}{j['url']}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")


# ---------- Admin management ----------
class TestAdminManagement:
    def test_admin_stats(self, admin_client):
        r = admin_client.get(f"{API}/admin/stats")
        assert r.status_code == 200
        j = r.json()
        for k in ("users", "restaurants", "orders", "scans", "active_owners", "plans"):
            assert k in j

    def test_admin_users_has_slug(self, admin_client, owner_ctx):
        r = admin_client.get(f"{API}/admin/users")
        assert r.status_code == 200
        users = r.json()
        target = next((u for u in users if u["user_id"] == owner_ctx["user_id"]), None)
        assert target is not None
        assert target.get("restaurant_slug") == owner_ctx["slug"]

    def test_admin_patch_plan(self, admin_client, owner_ctx):
        r = admin_client.patch(f"{API}/admin/users/{owner_ctx['user_id']}/plan",
                               json={"plan": "premium", "days": 30})
        assert r.status_code == 200
        assert r.json()["plan"] == "premium"

    def test_admin_suspend_and_block_login(self, admin_client, owner_ctx):
        r = admin_client.patch(f"{API}/admin/users/{owner_ctx['user_id']}/status",
                               json={"status": "suspended"})
        assert r.status_code == 200
        # login should return 403
        r2 = requests.post(f"{API}/auth/login", json={
            "email": owner_ctx["email"], "password": owner_ctx["password"],
        })
        assert r2.status_code == 403
        # reactivate
        admin_client.patch(f"{API}/admin/users/{owner_ctx['user_id']}/status",
                           json={"status": "active"})

    def test_owner_cannot_access_admin(self, owner_ctx):
        r = owner_ctx["session"].get(f"{API}/admin/stats")
        assert r.status_code == 403


# ---------- NEW: Coupons ----------
class TestCoupons:
    def test_create_coupon_percent(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.post(f"{API}/coupons", json={
            "code": "TESTPCT20", "kind": "percent", "value": 20,
            "min_order": 10, "max_discount": 5, "active": True,
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["code"] == "TESTPCT20"
        assert j["kind"] == "percent"
        owner_ctx["coupon_id_pct"] = j["coupon_id"]

    def test_create_coupon_flat(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.post(f"{API}/coupons", json={
            "code": "TESTFLAT3", "kind": "flat", "value": 3,
            "min_order": 5, "active": True,
        })
        assert r.status_code == 200
        owner_ctx["coupon_id_flat"] = r.json()["coupon_id"]

    def test_duplicate_coupon_400(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.post(f"{API}/coupons", json={
            "code": "TESTPCT20", "kind": "flat", "value": 1,
        })
        assert r.status_code == 400

    def test_list_coupons(self, owner_ctx):
        s = owner_ctx["session"]
        r = s.get(f"{API}/coupons")
        assert r.status_code == 200
        codes = {c["code"] for c in r.json()}
        assert "TESTPCT20" in codes and "TESTFLAT3" in codes

    def test_patch_coupon_toggle(self, owner_ctx):
        s = owner_ctx["session"]
        cid = owner_ctx["coupon_id_flat"]
        r = s.patch(f"{API}/coupons/{cid}", json={"active": False})
        assert r.status_code == 200
        # validate returns 404 when inactive
        slug = owner_ctx["slug"]
        r2 = requests.get(f"{API}/public/coupons/{slug}/TESTFLAT3?subtotal=100")
        assert r2.status_code == 404
        # re-enable
        s.patch(f"{API}/coupons/{cid}", json={"active": True})

    def test_public_validate_percent_with_cap(self, owner_ctx):
        # 20% of 100 = 20, but max_discount=5 -> 5
        slug = owner_ctx["slug"]
        r = requests.get(f"{API}/public/coupons/{slug}/TESTPCT20?subtotal=100")
        assert r.status_code == 200
        j = r.json()
        assert j["discount"] == 5.0

    def test_public_validate_percent_no_cap_hit(self, owner_ctx):
        # 20% of 20 = 4 (< cap 5)
        slug = owner_ctx["slug"]
        r = requests.get(f"{API}/public/coupons/{slug}/TESTPCT20?subtotal=20")
        assert r.status_code == 200
        assert r.json()["discount"] == 4.0

    def test_public_validate_flat(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.get(f"{API}/public/coupons/{slug}/TESTFLAT3?subtotal=50")
        assert r.status_code == 200
        assert r.json()["discount"] == 3.0

    def test_public_validate_below_min(self, owner_ctx):
        slug = owner_ctx["slug"]
        # TESTPCT20 requires min_order 10
        r = requests.get(f"{API}/public/coupons/{slug}/TESTPCT20?subtotal=5")
        assert r.status_code == 400

    def test_public_validate_invalid(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.get(f"{API}/public/coupons/{slug}/NOSUCHCODE?subtotal=50")
        assert r.status_code == 404

    def test_delete_coupon(self, owner_ctx):
        s = owner_ctx["session"]
        cid = owner_ctx["coupon_id_flat"]
        r = s.delete(f"{API}/coupons/{cid}")
        assert r.status_code == 200
        # confirm gone
        r2 = s.get(f"{API}/coupons")
        assert not any(c["coupon_id"] == cid for c in r2.json())


# ---------- NEW: Reviews ----------
class TestReviews:
    def test_create_review_valid(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.post(f"{API}/public/reviews", json={
            "restaurant_slug": slug, "customer_name": "Bob",
            "rating": 5, "comment": "Awesome",
        })
        assert r.status_code == 200, r.text
        assert r.json()["rating"] == 5

    def test_create_review_4(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.post(f"{API}/public/reviews", json={
            "restaurant_slug": slug, "customer_name": "Carol",
            "rating": 4, "comment": "Good",
        })
        assert r.status_code == 200

    def test_create_review_invalid_rating(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.post(f"{API}/public/reviews", json={
            "restaurant_slug": slug, "customer_name": "X",
            "rating": 6, "comment": "",
        })
        assert r.status_code == 400
        r2 = requests.post(f"{API}/public/reviews", json={
            "restaurant_slug": slug, "customer_name": "X",
            "rating": 0, "comment": "",
        })
        assert r2.status_code == 400

    def test_public_reviews_list_and_avg(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.get(f"{API}/public/reviews/{slug}")
        assert r.status_code == 200
        j = r.json()
        assert j["count"] >= 2
        assert j["average"] > 0
        # avg of 5 and 4 = 4.5
        assert j["average"] == 4.5

    def test_owner_reviews_auth(self, owner_ctx):
        r = owner_ctx["session"].get(f"{API}/reviews")
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 2

    def test_owner_reviews_requires_auth(self):
        r = requests.get(f"{API}/reviews")
        assert r.status_code == 401

    def test_public_restaurant_includes_reviews_summary(self, owner_ctx):
        r = requests.get(f"{API}/public/restaurant/{owner_ctx['slug']}")
        assert r.status_code == 200
        j = r.json()
        assert "reviews_summary" in j
        assert j["reviews_summary"]["count"] >= 2
        assert j["reviews_summary"]["average"] == 4.5


# ---------- NEW: Restaurant Profile new fields ----------
class TestRestaurantProfileNewFields:
    def test_patch_new_fields(self, owner_ctx):
        s = owner_ctx["session"]
        payload = {
            "about_us": "We serve fine food",
            "gst_percent": 5,
            "service_charge_percent": 10,
            "delivery_charge": 4,
            "min_order": 15,
            "offer_banner": "20% off Fridays",
            "offer_banner_active": True,
            "gallery": ["https://example.com/1.jpg", "https://example.com/2.jpg"],
            "accept_dine_in": True,
            "accept_takeaway": True,
            "accept_delivery": True,
        }
        r = s.patch(f"{API}/restaurant/me", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        for k, v in payload.items():
            assert j.get(k) == v, f"{k} did not persist: got {j.get(k)}"


# ---------- NEW: Orders with tax / coupon / delivery ----------
class TestOrdersEnhanced:
    @pytest.fixture(autouse=True)
    def _ensure_profile(self, owner_ctx):
        # Ensure tax/delivery/min_order fields are set on this worker's restaurant
        owner_ctx["session"].patch(f"{API}/restaurant/me", json={
            "gst_percent": 5, "service_charge_percent": 10,
            "delivery_charge": 4, "min_order": 15, "is_open": True,
        })

    def test_order_below_min_400(self, owner_ctx):
        # after profile patch, min_order=15
        slug = owner_ctx["slug"]
        r = requests.post(f"{API}/public/orders", json={
            "restaurant_slug": slug, "customer_name": "A", "customer_phone": "1",
            "items": [{"item_id": "x", "name": "Snack", "price": 5, "quantity": 1}],
            "order_type": "dine_in",
        })
        assert r.status_code == 400

    def test_order_with_coupon_gst_service(self, owner_ctx):
        # subtotal 100, coupon TESTPCT20 -> 20% -> 20 but capped at 5 -> discount=5
        # taxable=95, gst=5% ->4.75, svc=10% ->9.5, delivery=0 (dine_in)
        # total = 95 + 4.75 + 9.5 = 109.25
        slug = owner_ctx["slug"]
        r = requests.post(f"{API}/public/orders", json={
            "restaurant_slug": slug, "customer_name": "A", "customer_phone": "1",
            "items": [{"item_id": "x", "name": "Meal", "price": 50, "quantity": 2}],
            "order_type": "dine_in",
            "coupon_code": "TESTPCT20",
        })
        assert r.status_code == 200, r.text
        o = r.json()["order"]
        assert o["subtotal"] == 100.0
        assert o["discount"] == 5.0
        assert o["gst_amount"] == 4.75
        assert o["service_charge"] == 9.5
        assert o["delivery_charge"] == 0
        assert o["total"] == 109.25
        assert o["coupon_code"] == "TESTPCT20"
        assert o["order_type"] == "dine_in"
        assert o["status"] == "sent"
        owner_ctx["order_id"] = o["order_id"]

    def test_order_delivery_charge_applied(self, owner_ctx):
        # order_type=delivery -> delivery_charge=4
        slug = owner_ctx["slug"]
        r = requests.post(f"{API}/public/orders", json={
            "restaurant_slug": slug, "customer_name": "A", "customer_phone": "1",
            "address": "123 Main St",
            "items": [{"item_id": "x", "name": "Meal", "price": 20, "quantity": 1}],
            "order_type": "delivery",
        })
        assert r.status_code == 200, r.text
        o = r.json()["order"]
        # subtotal=20, no coupon; gst 5% of 20 = 1.0; svc 10% = 2.0; delivery=4
        assert o["delivery_charge"] == 4.0
        assert o["gst_amount"] == 1.0
        assert o["service_charge"] == 2.0
        assert o["total"] == 27.0
        assert o["order_type"] == "delivery"
        assert o["address"] == "123 Main St"

    def test_order_when_closed_400(self, owner_ctx):
        s = owner_ctx["session"]
        # close restaurant
        s.patch(f"{API}/restaurant/me", json={"is_open": False})
        slug = owner_ctx["slug"]
        r = requests.post(f"{API}/public/orders", json={
            "restaurant_slug": slug, "customer_name": "A", "customer_phone": "1",
            "items": [{"item_id": "x", "name": "Meal", "price": 50, "quantity": 1}],
            "order_type": "dine_in",
        })
        assert r.status_code == 400
        # reopen
        s.patch(f"{API}/restaurant/me", json={"is_open": True})


# ---------- NEW: Order status updates ----------
class TestOrderStatus:
    @pytest.fixture(scope="class")
    def order_id(self, owner_ctx):
        # ensure open + create a fresh order
        owner_ctx["session"].patch(f"{API}/restaurant/me", json={"is_open": True, "min_order": 0})
        r = requests.post(f"{API}/public/orders", json={
            "restaurant_slug": owner_ctx["slug"],
            "customer_name": "Status", "customer_phone": "1",
            "items": [{"item_id": "x", "name": "Meal", "price": 20, "quantity": 1}],
            "order_type": "dine_in",
        })
        assert r.status_code == 200, r.text
        return r.json()["order"]["order_id"]

    def test_update_status_valid(self, owner_ctx, order_id):
        s = owner_ctx["session"]
        r = s.patch(f"{API}/orders/{order_id}", json={"status": "preparing"})
        assert r.status_code == 200
        r2 = s.get(f"{API}/orders")
        assert r2.status_code == 200
        o = next((x for x in r2.json() if x["order_id"] == order_id), None)
        assert o and o["status"] == "preparing"

    def test_update_status_invalid_400(self, owner_ctx, order_id):
        r = owner_ctx["session"].patch(f"{API}/orders/{order_id}", json={"status": "bogus"})
        assert r.status_code == 400

    def test_update_status_not_found(self, owner_ctx):
        r = owner_ctx["session"].patch(f"{API}/orders/ord_nonexistent", json={"status": "ready"})
        assert r.status_code == 404


# ---------- NEW iter-3: AI translate ----------
class TestAITranslate:
    def test_translate_requires_auth(self):
        r = requests.post(f"{API}/ai/translate", json={"text": "Hello", "target_language": "hi"})
        assert r.status_code == 401

    def test_translate_hindi(self, owner_ctx):
        r = owner_ctx["session"].post(f"{API}/ai/translate", json={
            "text": "Paneer Tikka - grilled cottage cheese", "target_language": "hi",
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert "translated" in j and isinstance(j["translated"], str) and len(j["translated"]) > 0
        assert j.get("language") == "Hindi"

    def test_translate_spanish(self, owner_ctx):
        r = owner_ctx["session"].post(f"{API}/ai/translate", json={
            "text": "Chicken Curry", "target_language": "es",
        })
        assert r.status_code == 200
        assert r.json().get("language") == "Spanish"


# ---------- NEW iter-3: AI menu from photo ----------
class TestAIMenuFromPhoto:
    # 1x1 JPEG (minimal valid) - use a small PNG payload; endpoint accepts image/* content type
    PNG_BYTES = bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
        "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
    )

    def _client(self, owner_ctx):
        s2 = requests.Session()
        s2.headers.update({"Authorization": owner_ctx["session"].headers["Authorization"]})
        return s2

    def test_menu_from_photo_requires_auth(self):
        files = {"file": ("m.png", io.BytesIO(self.PNG_BYTES), "image/png")}
        r = requests.post(f"{API}/ai/menu-from-photo", files=files)
        assert r.status_code == 401

    def test_menu_from_photo_rejects_non_image(self, owner_ctx):
        s = self._client(owner_ctx)
        files = {"file": ("m.txt", io.BytesIO(b"not an image"), "text/plain")}
        r = s.post(f"{API}/ai/menu-from-photo", files=files, timeout=60)
        assert r.status_code == 400, r.text

    def test_menu_from_photo_success_shape(self, owner_ctx):
        s = self._client(owner_ctx)
        files = {"file": ("m.png", io.BytesIO(self.PNG_BYTES), "image/png")}
        r = s.post(f"{API}/ai/menu-from-photo", files=files, timeout=90)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "items" in j and isinstance(j["items"], list)
        assert "count" in j and j["count"] == len(j["items"])
        # If any items returned, verify schema
        for it in j["items"]:
            assert set(["name", "description", "price", "category", "veg", "spicy_level", "bestseller"]).issubset(it.keys())
            assert isinstance(it["price"], (int, float))
            assert isinstance(it["veg"], bool)
            assert 0 <= it["spicy_level"] <= 3


# ---------- NEW iter-3: find-or-create category ----------
class TestFindOrCreateCategory:
    def test_requires_auth(self):
        r = requests.post(f"{API}/categories/find-or-create", json={"name": "Drinks"})
        assert r.status_code == 401

    def test_empty_name_400(self, owner_ctx):
        r = owner_ctx["session"].post(f"{API}/categories/find-or-create", json={"name": "   "})
        assert r.status_code == 400

    def test_create_new(self, owner_ctx):
        unique = f"TESTCAT_{uuid.uuid4().hex[:6]}"
        r = owner_ctx["session"].post(f"{API}/categories/find-or-create", json={"name": unique})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["name"] == unique
        assert j["category_id"].startswith("cat_")
        owner_ctx["foc_cat_id"] = j["category_id"]
        owner_ctx["foc_cat_name"] = unique

    def test_idempotent_same_name(self, owner_ctx):
        name = owner_ctx["foc_cat_name"]
        r = owner_ctx["session"].post(f"{API}/categories/find-or-create", json={"name": name})
        assert r.status_code == 200
        assert r.json()["category_id"] == owner_ctx["foc_cat_id"]

    def test_case_insensitive_match(self, owner_ctx):
        name = owner_ctx["foc_cat_name"].lower()
        r = owner_ctx["session"].post(f"{API}/categories/find-or-create", json={"name": name})
        assert r.status_code == 200
        assert r.json()["category_id"] == owner_ctx["foc_cat_id"]


# ---------- NEW iter-3: bulk items ----------
class TestBulkItems:
    def test_requires_auth(self, owner_ctx):
        r = requests.post(f"{API}/items/bulk", json={
            "category_id": owner_ctx.get("foc_cat_id", "x"),
            "items": [{"name": "A", "price": 1}],
        })
        assert r.status_code == 401

    def test_bulk_create_success(self, owner_ctx):
        s = owner_ctx["session"]
        # ensure we have a category
        cid = owner_ctx.get("foc_cat_id")
        if not cid:
            r0 = s.post(f"{API}/categories/find-or-create", json={"name": f"BULKCAT_{uuid.uuid4().hex[:6]}"})
            cid = r0.json()["category_id"]
            owner_ctx["foc_cat_id"] = cid
        payload = {
            "category_id": cid,
            "items": [
                {"name": "BulkItem A", "description": "d1", "price": 5.5, "veg": True, "spicy_level": 1, "bestseller": False},
                {"name": "BulkItem B", "description": "d2", "price": 7.0, "veg": False, "spicy_level": 2, "bestseller": True},
                {"name": "BulkItem C", "price": 3.25},
            ],
        }
        r = s.post(f"{API}/items/bulk", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["created"] == 3
        assert len(j["items"]) == 3
        names = {it["name"] for it in j["items"]}
        assert {"BulkItem A", "BulkItem B", "BulkItem C"}.issubset(names)
        for it in j["items"]:
            assert it["category_id"] == cid
            assert "_id" not in it
            assert it["item_id"].startswith("item_")
        # verify persistence via list
        r2 = s.get(f"{API}/items")
        assert r2.status_code == 200
        all_names = {i["name"] for i in r2.json()}
        assert {"BulkItem A", "BulkItem B", "BulkItem C"}.issubset(all_names)

    def test_bulk_nonexistent_category_404(self, owner_ctx):
        r = owner_ctx["session"].post(f"{API}/items/bulk", json={
            "category_id": "cat_doesnotexist_xyz",
            "items": [{"name": "X", "price": 1}],
        })
        assert r.status_code == 404

    def test_bulk_other_owner_category_404(self, owner_ctx):
        # Register a second owner and create a category, then attempt bulk with first owner's session
        unique = uuid.uuid4().hex[:8]
        s2 = requests.Session()
        reg = s2.post(f"{API}/auth/register", json={
            "email": f"TEST_owner2_{unique}@example.com",
            "password": "OwnerPass123!",
            "name": f"TEST Owner2 {unique}",
            "restaurant_name": f"TEST Diner2 {unique}",
        })
        assert reg.status_code == 200, reg.text
        tok2 = reg.json()["token"]
        uid2 = reg.json()["user_id"]
        s2.headers.update({"Authorization": f"Bearer {tok2}"})
        cr = s2.post(f"{API}/categories", json={"name": "OtherCat", "order": 0})
        assert cr.status_code == 200
        other_cid = cr.json()["category_id"]
        # First owner tries to bulk-add into other owner's category
        r = owner_ctx["session"].post(f"{API}/items/bulk", json={
            "category_id": other_cid,
            "items": [{"name": "Sneaky", "price": 1}],
        })
        assert r.status_code == 404, r.text
        # Cleanup second owner via admin
        try:
            adm = requests.Session()
            lg = adm.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
            adm.headers.update({"Authorization": f"Bearer {lg.json()['token']}"})
            adm.delete(f"{API}/admin/users/{uid2}")
        except Exception:
            pass


# ---------- NEW iter-4: platform config ----------
class TestPlatformConfig:
    def test_platform_config(self):
        r = requests.get(f"{API}/platform-config")
        assert r.status_code == 200
        j = r.json()
        assert j.get("whatsapp") == "917226978918"
        assert j.get("currency") == "₹"


# ---------- NEW iter-4: plans catalog INR pricing ----------
class TestPlansPricing:
    def test_plans_prices(self):
        r = requests.get(f"{API}/plans")
        assert r.status_code == 200
        plans = {p["id"]: p for p in r.json()}
        assert plans["free"]["price"] == 0
        assert plans["starter"]["price"] == 799
        assert plans["premium"]["price"] == 1499
        assert plans["business"]["price"] == 2999


# ---------- NEW iter-4: default currency on register ----------
class TestDefaultCurrencyOnRegister:
    def test_new_restaurant_currency_is_inr(self):
        unique = uuid.uuid4().hex[:8]
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={
            "email": f"TEST_curr_{unique}@example.com",
            "password": "OwnerPass123!",
            "name": f"TEST Curr {unique}",
            "restaurant_name": f"TEST CurrDiner {unique}",
        })
        assert r.status_code == 200, r.text
        tok = r.json()["token"]
        uid = r.json()["user_id"]
        slug = r.json()["restaurant_slug"]
        s.headers.update({"Authorization": f"Bearer {tok}"})
        pub = requests.get(f"{API}/public/restaurant/{slug}")
        assert pub.status_code == 200
        assert pub.json()["restaurant"].get("currency") == "₹"
        # cleanup
        try:
            adm = requests.Session()
            lg = adm.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
            adm.headers.update({"Authorization": f"Bearer {lg.json()['token']}"})
            adm.delete(f"{API}/admin/users/{uid}")
        except Exception:
            pass


# ---------- NEW iter-4: plan status ----------
class TestPlanStatus:
    def test_requires_auth(self):
        r = requests.get(f"{API}/plan/status")
        assert r.status_code == 401

    def test_admin_plan_status(self, admin_client):
        r = admin_client.get(f"{API}/plan/status")
        assert r.status_code == 200
        j = r.json()
        assert j["plan"] == "admin"
        assert j["expired"] is False

    def test_owner_plan_status_default(self, owner_ctx):
        r = owner_ctx["session"].get(f"{API}/plan/status")
        assert r.status_code == 200
        j = r.json()
        assert "plan" in j
        assert "days_remaining" in j
        assert "expired" in j
        assert "expiring_soon" in j
        assert j.get("renewal_whatsapp") == "917226978918"

    def test_owner_plan_expired(self, admin_client, owner_ctx):
        # set plan_expires_at 5 days in past via admin
        r = admin_client.patch(f"{API}/admin/users/{owner_ctx['user_id']}/plan",
                               json={"plan": "starter", "days": -5})
        assert r.status_code == 200
        r2 = owner_ctx["session"].get(f"{API}/plan/status")
        assert r2.status_code == 200
        j = r2.json()
        assert j["expired"] is True
        assert j["status"] == "expired"

    def test_owner_plan_expiring_soon(self, admin_client, owner_ctx):
        r = admin_client.patch(f"{API}/admin/users/{owner_ctx['user_id']}/plan",
                               json={"plan": "starter", "days": 3})
        assert r.status_code == 200
        r2 = owner_ctx["session"].get(f"{API}/plan/status")
        assert r2.status_code == 200
        j = r2.json()
        assert j["expired"] is False
        assert j["expiring_soon"] is True
        assert 0 <= j["days_remaining"] <= 5


# ---------- NEW iter-4: public translate menu ----------
class TestTranslateMenu:
    def test_translate_en_returns_empty(self, owner_ctx):
        r = requests.get(f"{API}/public/translate-menu/{owner_ctx['slug']}?lang=en", timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert j["lang"] == "en"
        assert j["translations"] == {}

    def test_translate_404_bad_slug(self):
        r = requests.get(f"{API}/public/translate-menu/nonexistent-xyz-999?lang=hi", timeout=30)
        assert r.status_code == 404

    def test_translate_hindi_and_cache(self, owner_ctx):
        slug = owner_ctx["slug"]
        r = requests.get(f"{API}/public/translate-menu/{slug}?lang=hi", timeout=45)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["lang"] == "hi"
        tr = j["translations"]
        assert isinstance(tr, dict)
        # structure check
        assert "tagline" in tr
        assert "about_us" in tr
        assert "categories" in tr and isinstance(tr["categories"], dict)
        assert "items" in tr and isinstance(tr["items"], dict)
        # Item values should have name + description
        if tr["items"]:
            first = next(iter(tr["items"].values()))
            assert "name" in first and "description" in first
        # 2nd call should be cached
        r2 = requests.get(f"{API}/public/translate-menu/{slug}?lang=hi", timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("cached") is True

    def test_translate_spanish(self, owner_ctx):
        r = requests.get(f"{API}/public/translate-menu/{owner_ctx['slug']}?lang=es", timeout=45)
        assert r.status_code == 200
        assert isinstance(r.json()["translations"], dict)

    def test_translate_french(self, owner_ctx):
        r = requests.get(f"{API}/public/translate-menu/{owner_ctx['slug']}?lang=fr", timeout=45)
        assert r.status_code == 200
        assert isinstance(r.json()["translations"], dict)

    def test_translate_tamil(self, owner_ctx):
        r = requests.get(f"{API}/public/translate-menu/{owner_ctx['slug']}?lang=ta", timeout=45)
        assert r.status_code == 200
        assert isinstance(r.json()["translations"], dict)


# ---------- Cleanup: cascade delete ----------
class TestCleanupCascade:
    def test_delete_user_cascade(self, admin_client, owner_ctx):
        uid = owner_ctx["user_id"]
        slug = owner_ctx["slug"]
        r = admin_client.delete(f"{API}/admin/users/{uid}")
        assert r.status_code == 200
        # restaurant slug should no longer resolve publicly
        r2 = requests.get(f"{API}/public/restaurant/{slug}")
        assert r2.status_code == 404

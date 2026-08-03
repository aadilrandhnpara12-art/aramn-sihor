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

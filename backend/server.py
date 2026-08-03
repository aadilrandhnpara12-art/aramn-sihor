from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import logging
import secrets
import bcrypt
import jwt
import requests as http_requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from urllib.parse import quote_plus

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Header, Query
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- App Setup ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
APP_NAME = os.environ.get('APP_NAME', 'menu-maker')
PLATFORM_WHATSAPP = os.environ.get('PLATFORM_WHATSAPP', '917226978918')
DEFAULT_CURRENCY = os.environ.get('DEFAULT_CURRENCY', '₹')

app = FastAPI(title="Menu Maker SaaS")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("menu_maker")

# ---------- Object Storage ----------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        r = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage not available")
    r = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage not available")
    r = http_requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------- Password Helpers ----------

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, role: str, minutes: int = 60 * 24 * 7) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


async def require_owner(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("owner", "admin"):
        raise HTTPException(403, "Owner only")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, secure=True, samesite="none",
        max_age=60 * 60 * 24 * 7, path="/",
    )


# ---------- Models ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    restaurant_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class Category(BaseModel):
    name: str
    order: int = 0


class MenuItem(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category_id: str
    image_url: Optional[str] = None
    veg: bool = True
    bestseller: bool = False
    spicy_level: int = 0  # 0-3
    available: bool = True
    order: int = 0


class RestaurantProfile(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    business_hours: Optional[str] = None
    is_open: Optional[bool] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    google_map: Optional[str] = None
    theme: Optional[str] = None  # "warm" | "dark"
    accent_color: Optional[str] = None
    social: Optional[dict] = None
    currency: Optional[str] = "$"
    # New fields
    about_us: Optional[str] = None
    gst_percent: Optional[float] = None
    service_charge_percent: Optional[float] = None
    delivery_charge: Optional[float] = None
    min_order: Optional[float] = None
    offer_banner: Optional[str] = None
    offer_banner_active: Optional[bool] = None
    gallery: Optional[List[str]] = None
    accept_dine_in: Optional[bool] = None
    accept_takeaway: Optional[bool] = None
    accept_delivery: Optional[bool] = None


class TableCreate(BaseModel):
    label: str


class OrderCreate(BaseModel):
    restaurant_slug: str
    customer_name: str
    customer_phone: str
    table_number: Optional[str] = None
    notes: Optional[str] = None
    items: List[dict]  # [{item_id, name, price, quantity}]
    order_type: Optional[str] = "dine_in"  # dine_in | takeaway | delivery
    coupon_code: Optional[str] = None
    address: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str  # sent | preparing | ready | delivered | cancelled


class CouponCreate(BaseModel):
    code: str
    kind: str  # percent | flat
    value: float
    min_order: float = 0
    max_discount: Optional[float] = None
    active: bool = True


class ReviewCreate(BaseModel):
    restaurant_slug: str
    customer_name: str
    rating: int  # 1..5
    comment: Optional[str] = ""


class AIDescribeRequest(BaseModel):
    item_name: str
    hints: Optional[str] = ""


class AITranslateRequest(BaseModel):
    text: str
    target_language: str  # "hi", "en", "es", "fr", "ar"


class BulkItemsRequest(BaseModel):
    category_id: str
    items: List[dict]  # [{name, description, price, veg, spicy_level, bestseller}]


class UpdatePlanRequest(BaseModel):
    plan: str  # free|starter|premium|business
    days: int = 30


# ---------- Slug Helper ----------

def make_slug(name: str) -> str:
    base = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "restaurant"


async def unique_slug(name: str) -> str:
    base = make_slug(name)
    slug = base
    i = 2
    while await db.restaurants.find_one({"slug": slug}):
        slug = f"{base}-{i}"
        i += 1
    return slug


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.restaurants.create_index("slug", unique=True)
    await db.restaurants.create_index("owner_id")
    await db.categories.create_index("restaurant_id")
    await db.menu_items.create_index("restaurant_id")
    await db.tables.create_index("restaurant_id")
    await db.orders.create_index("restaurant_id")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.qr_scans.create_index("restaurant_id")
    await db.coupons.create_index([("restaurant_id", 1), ("code", 1)], unique=True)
    await db.reviews.create_index("restaurant_id")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Super Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    else:
        # keep admin password in sync with env
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})

    # Init storage (non-blocking)
    init_storage()


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "owner",
        "plan": "free",
        "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)

    # Create restaurant shell
    restaurant_name = body.restaurant_name or f"{body.name}'s Restaurant"
    slug = await unique_slug(restaurant_name)
    rid = f"rest_{uuid.uuid4().hex[:12]}"
    await db.restaurants.insert_one({
        "restaurant_id": rid,
        "slug": slug,
        "owner_id": user_id,
        "name": restaurant_name,
        "tagline": "",
        "address": "",
        "phone": "",
        "whatsapp": "",
        "business_hours": "Mon-Sun 9:00 - 22:00",
        "is_open": True,
        "logo_url": None,
        "banner_url": None,
        "google_map": "",
        "theme": "warm",
        "accent_color": "#C2410C",
        "social": {},
        "currency": DEFAULT_CURRENCY,
        "gst_percent": 0,
        "service_charge_percent": 0,
        "delivery_charge": 0,
        "min_order": 0,
        "offer_banner": "",
        "offer_banner_active": False,
        "gallery": [],
        "about_us": "",
        "accept_dine_in": True,
        "accept_takeaway": True,
        "accept_delivery": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    token = create_token(user_id, "owner")
    set_auth_cookie(response, token)
    return {"user_id": user_id, "email": email, "name": body.name, "role": "owner", "token": token, "restaurant_slug": slug}


@api.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    if user.get("status") == "suspended":
        raise HTTPException(403, "Account suspended")
    token = create_token(user["user_id"], user["role"])
    set_auth_cookie(response, token)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "token": token,
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    # Attach restaurant slug for owners
    if user.get("role") == "owner":
        r = await db.restaurants.find_one({"owner_id": user["user_id"]}, {"_id": 0, "slug": 1, "restaurant_id": 1})
        if r:
            user["restaurant_slug"] = r["slug"]
            user["restaurant_id"] = r["restaurant_id"]
    return user


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        tok = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": tok, "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info(f"[PASSWORD RESET] user={email} token={tok}")
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordRequest):
    doc = await db.password_reset_tokens.find_one({"token": body.token, "used": False})
    if not doc:
        raise HTTPException(400, "Invalid or expired token")
    exp = doc["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expired")
    await db.users.update_one({"user_id": doc["user_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_reset_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used": True}})
    return {"ok": True}


# ---------- Emergent Google Auth ----------
@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id required")
    try:
        r = http_requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=15,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(400, f"OAuth session invalid: {e}")

    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email),
            "picture": data.get("picture"),
            "role": "owner",
            "plan": "free",
            "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            "status": "active",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Create shell restaurant
        rname = f"{data.get('name', 'My')}'s Restaurant"
        slug = await unique_slug(rname)
        await db.restaurants.insert_one({
            "restaurant_id": f"rest_{uuid.uuid4().hex[:12]}",
            "slug": slug, "owner_id": user_id, "name": rname,
            "tagline": "", "address": "", "phone": "", "whatsapp": "",
            "business_hours": "Mon-Sun 9:00 - 22:00", "is_open": True,
            "logo_url": None, "banner_url": None, "google_map": "",
            "theme": "warm", "accent_color": "#C2410C", "social": {}, "currency": DEFAULT_CURRENCY,
            "gst_percent": 0, "service_charge_percent": 0, "delivery_charge": 0, "min_order": 0,
            "offer_banner": "", "offer_banner_active": False, "gallery": [], "about_us": "",
            "accept_dine_in": True, "accept_takeaway": True, "accept_delivery": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        user = await db.users.find_one({"email": email})

    token = create_token(user["user_id"], user["role"])
    set_auth_cookie(response, token)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "role": user["role"], "token": token}


# ---------- Files / Upload ----------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only images allowed")
    ext = (file.filename.split(".")[-1] if "." in (file.filename or "") else "bin").lower()
    path = f"{APP_NAME}/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type)
    await db.files.insert_one({
        "file_id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "owner_id": user["user_id"],
        "content_type": file.content_type,
        "size": result.get("size"),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def get_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    data, ct = get_object(path)
    return FastAPIResponse(content=data, media_type=rec.get("content_type", ct))


# ---------- Restaurant (Owner) ----------
async def get_owner_restaurant(user: dict) -> dict:
    r = await db.restaurants.find_one({"owner_id": user["user_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    return r


@api.get("/restaurant/me")
async def restaurant_me(user: dict = Depends(require_owner)):
    return await get_owner_restaurant(user)


@api.patch("/restaurant/me")
async def restaurant_update(body: RestaurantProfile, user: dict = Depends(require_owner)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return await get_owner_restaurant(user)
    await db.restaurants.update_one({"owner_id": user["user_id"]}, {"$set": updates})
    return await get_owner_restaurant(user)


# ---------- Categories ----------
@api.get("/categories")
async def list_categories(user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    cats = await db.categories.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).sort("order", 1).to_list(500)
    return cats


@api.post("/categories")
async def create_category(body: Category, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    doc = {
        "category_id": f"cat_{uuid.uuid4().hex[:10]}",
        "restaurant_id": r["restaurant_id"],
        "name": body.name, "order": body.order,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/categories/{category_id}")
async def update_category(category_id: str, body: Category, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    res = await db.categories.update_one(
        {"category_id": category_id, "restaurant_id": r["restaurant_id"]},
        {"$set": {"name": body.name, "order": body.order}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    await db.categories.delete_one({"category_id": category_id, "restaurant_id": r["restaurant_id"]})
    await db.menu_items.delete_many({"category_id": category_id, "restaurant_id": r["restaurant_id"]})
    return {"ok": True}


# ---------- Menu Items ----------
@api.get("/items")
async def list_items(user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    items = await db.menu_items.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).to_list(2000)
    return items


@api.post("/items")
async def create_item(body: MenuItem, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    doc = {
        "item_id": f"item_{uuid.uuid4().hex[:10]}",
        "restaurant_id": r["restaurant_id"],
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "views": 0,
    }
    await db.menu_items.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/items/{item_id}")
async def update_item(item_id: str, body: MenuItem, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    res = await db.menu_items.update_one(
        {"item_id": item_id, "restaurant_id": r["restaurant_id"]},
        {"$set": body.model_dump()},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.delete("/items/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    await db.menu_items.delete_one({"item_id": item_id, "restaurant_id": r["restaurant_id"]})
    return {"ok": True}


# ---------- Tables ----------
@api.get("/tables")
async def list_tables(user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    ts = await db.tables.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).to_list(500)
    return ts


@api.post("/tables")
async def create_table(body: TableCreate, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    doc = {
        "table_id": f"tbl_{uuid.uuid4().hex[:8]}",
        "restaurant_id": r["restaurant_id"],
        "label": body.label,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tables.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/tables/{table_id}")
async def delete_table(table_id: str, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    await db.tables.delete_one({"table_id": table_id, "restaurant_id": r["restaurant_id"]})
    return {"ok": True}


# ---------- Public (Customer) ----------
@api.get("/public/restaurant/{slug}")
async def public_restaurant(slug: str, table: Optional[str] = None):
    r = await db.restaurants.find_one({"slug": slug}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    cats = await db.categories.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).sort("order", 1).to_list(500)
    items = await db.menu_items.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).to_list(2000)
    revs_agg = await db.reviews.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0, "rating": 1}).to_list(2000)
    avg = round(sum(x["rating"] for x in revs_agg) / len(revs_agg), 1) if revs_agg else 0
    # Log scan
    await db.qr_scans.insert_one({
        "restaurant_id": r["restaurant_id"],
        "table": table,
        "at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "restaurant": r, "categories": cats, "items": items,
        "reviews_summary": {"average": avg, "count": len(revs_agg)},
    }


@api.post("/public/orders")
async def public_create_order(body: OrderCreate):
    r = await db.restaurants.find_one({"slug": body.restaurant_slug}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    if not r.get("is_open", True):
        raise HTTPException(400, "Restaurant is currently closed")

    subtotal = sum(float(i.get("price", 0)) * int(i.get("quantity", 1)) for i in body.items)
    min_order = float(r.get("min_order") or 0)
    if min_order and subtotal < min_order:
        raise HTTPException(400, f"Minimum order is {r.get('currency','$')}{min_order}")

    # Coupon
    discount = 0.0
    coupon_used = None
    if body.coupon_code:
        c = await db.coupons.find_one({"restaurant_id": r["restaurant_id"], "code": body.coupon_code.upper(), "active": True})
        if not c:
            raise HTTPException(400, "Invalid or inactive coupon")
        if subtotal < float(c.get("min_order", 0)):
            raise HTTPException(400, f"Coupon requires minimum order of {r.get('currency','$')}{c['min_order']}")
        if c["kind"] == "percent":
            discount = subtotal * (float(c["value"]) / 100)
            if c.get("max_discount"):
                discount = min(discount, float(c["max_discount"]))
        else:
            discount = float(c["value"])
        coupon_used = c["code"]

    gst_pct = float(r.get("gst_percent") or 0)
    svc_pct = float(r.get("service_charge_percent") or 0)
    delivery = float(r.get("delivery_charge") or 0) if body.order_type == "delivery" else 0

    taxable = max(0, subtotal - discount)
    gst_amount = taxable * (gst_pct / 100)
    svc_amount = taxable * (svc_pct / 100)
    total = taxable + gst_amount + svc_amount + delivery

    order = {
        "order_id": f"ord_{uuid.uuid4().hex[:10]}",
        "restaurant_id": r["restaurant_id"],
        "customer_name": body.customer_name,
        "customer_phone": body.customer_phone,
        "table_number": body.table_number,
        "order_type": body.order_type or "dine_in",
        "notes": body.notes,
        "address": body.address,
        "items": body.items,
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "coupon_code": coupon_used,
        "gst_amount": round(gst_amount, 2),
        "service_charge": round(svc_amount, 2),
        "delivery_charge": round(delivery, 2),
        "total": round(total, 2),
        "currency": r.get("currency", "$"),
        "status": "sent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)

    # Build WhatsApp URL
    cur = r.get("currency", "$")
    lines = [f"*New Order — {r['name']}*", ""]
    if body.table_number:
        lines.append(f"Table: {body.table_number}")
    lines.append(f"Type: {body.order_type or 'dine_in'}")
    lines.append(f"Customer: {body.customer_name}")
    lines.append(f"Phone: {body.customer_phone}")
    if body.order_type == "delivery" and body.address:
        lines.append(f"Address: {body.address}")
    lines.append("")
    lines.append("Items:")
    for it in body.items:
        lines.append(f"• {it['quantity']}× {it['name']} — {cur}{it['price']}")
    lines.append("")
    lines.append(f"Subtotal: {cur}{round(subtotal,2)}")
    if discount:
        lines.append(f"Discount ({coupon_used}): -{cur}{round(discount,2)}")
    if gst_amount:
        lines.append(f"GST ({gst_pct}%): {cur}{round(gst_amount,2)}")
    if svc_amount:
        lines.append(f"Service ({svc_pct}%): {cur}{round(svc_amount,2)}")
    if delivery:
        lines.append(f"Delivery: {cur}{round(delivery,2)}")
    lines.append(f"*Total: {cur}{round(total,2)}*")
    if body.notes:
        lines.append("")
        lines.append(f"Notes: {body.notes}")
    msg = "\n".join(lines)
    wa_number = (r.get("whatsapp") or "").replace("+", "").replace(" ", "").replace("-", "")
    wa_url = f"https://wa.me/{wa_number}?text={quote_plus(msg)}" if wa_number else None
    order.pop("_id", None)
    return {"order": order, "whatsapp_url": wa_url}


# ---------- Coupons ----------
@api.get("/coupons")
async def list_coupons(user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    cs = await db.coupons.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).to_list(200)
    return cs


@api.post("/coupons")
async def create_coupon(body: CouponCreate, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    doc = {
        "coupon_id": f"cpn_{uuid.uuid4().hex[:10]}",
        "restaurant_id": r["restaurant_id"],
        "code": body.code.upper(),
        "kind": body.kind,
        "value": body.value,
        "min_order": body.min_order,
        "max_discount": body.max_discount,
        "active": body.active,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.coupons.insert_one(doc)
    except Exception:
        raise HTTPException(400, "Coupon code already exists")
    doc.pop("_id", None)
    return doc


@api.patch("/coupons/{coupon_id}")
async def toggle_coupon(coupon_id: str, request: Request, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    body = await request.json()
    active = bool(body.get("active", True))
    res = await db.coupons.update_one({"coupon_id": coupon_id, "restaurant_id": r["restaurant_id"]}, {"$set": {"active": active}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    await db.coupons.delete_one({"coupon_id": coupon_id, "restaurant_id": r["restaurant_id"]})
    return {"ok": True}


@api.get("/public/coupons/{slug}/{code}")
async def public_validate_coupon(slug: str, code: str, subtotal: float = 0):
    r = await db.restaurants.find_one({"slug": slug}, {"_id": 0, "restaurant_id": 1, "currency": 1})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    c = await db.coupons.find_one({"restaurant_id": r["restaurant_id"], "code": code.upper(), "active": True})
    if not c:
        raise HTTPException(404, "Invalid coupon")
    if subtotal < float(c.get("min_order", 0)):
        raise HTTPException(400, f"Requires minimum order of {r.get('currency','$')}{c['min_order']}")
    if c["kind"] == "percent":
        disc = subtotal * (float(c["value"]) / 100)
        if c.get("max_discount"):
            disc = min(disc, float(c["max_discount"]))
    else:
        disc = float(c["value"])
    return {"code": c["code"], "kind": c["kind"], "value": c["value"], "discount": round(disc, 2)}


# ---------- Reviews ----------
@api.post("/public/reviews")
async def create_review(body: ReviewCreate):
    r = await db.restaurants.find_one({"slug": body.restaurant_slug}, {"_id": 0, "restaurant_id": 1})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "Rating must be 1-5")
    doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:10]}",
        "restaurant_id": r["restaurant_id"],
        "customer_name": body.customer_name,
        "rating": body.rating,
        "comment": body.comment or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/public/reviews/{slug}")
async def list_public_reviews(slug: str):
    r = await db.restaurants.find_one({"slug": slug}, {"_id": 0, "restaurant_id": 1})
    if not r:
        raise HTTPException(404, "Not found")
    revs = await db.reviews.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    avg = 0
    if revs:
        avg = round(sum(x["rating"] for x in revs) / len(revs), 1)
    return {"reviews": revs, "average": avg, "count": len(revs)}


@api.get("/reviews")
async def owner_reviews(user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    revs = await db.reviews.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return revs


# ---------- Order status ----------
@api.patch("/orders/{order_id}")
async def update_order_status(order_id: str, body: OrderStatusUpdate, user: dict = Depends(require_owner)):
    if body.status not in ("sent", "preparing", "ready", "delivered", "cancelled"):
        raise HTTPException(400, "Invalid status")
    r = await get_owner_restaurant(user)
    res = await db.orders.update_one(
        {"order_id": order_id, "restaurant_id": r["restaurant_id"]},
        {"$set": {"status": body.status}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------- AI Description ----------
@api.post("/ai/describe")
async def ai_describe(body: AIDescribeRequest, user: dict = Depends(require_owner)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"LLM lib missing: {e}")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"desc-{user['user_id']}-{uuid.uuid4().hex[:6]}",
        system_message="You are a food copywriter. Write concise, mouth-watering menu descriptions in 1-2 sentences (max 30 words). No emojis. No prices.",
    ).with_model("anthropic", "claude-sonnet-4-6")
    prompt = f"Menu item: {body.item_name}\nContext: {body.hints or 'n/a'}\nWrite the description now."
    msg = UserMessage(text=prompt)
    try:
        text = await chat.send_message(msg)
    except Exception as e:
        raise HTTPException(500, f"AI error: {e}")
    return {"description": (text or "").strip()}


@api.post("/ai/translate")
async def ai_translate(body: AITranslateRequest, user: dict = Depends(require_owner)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"LLM lib missing: {e}")
    lang_map = {"hi": "Hindi", "en": "English", "es": "Spanish", "fr": "French", "ar": "Arabic", "de": "German", "zh": "Chinese"}
    target = lang_map.get(body.target_language, body.target_language)
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"trans-{user['user_id']}-{uuid.uuid4().hex[:6]}",
        system_message=f"You are a professional translator. Translate the given menu text into {target}. Return ONLY the translated text, no notes.",
    ).with_model("anthropic", "claude-sonnet-4-6")
    try:
        text = await chat.send_message(UserMessage(text=body.text))
    except Exception as e:
        raise HTTPException(500, f"AI error: {e}")
    return {"translated": (text or "").strip(), "language": target}


@api.post("/ai/menu-from-photo")
async def ai_menu_from_photo(file: UploadFile = File(...), user: dict = Depends(require_owner)):
    """Extract menu items from a photo of a paper menu or handwritten list using Claude vision."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only images allowed")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except Exception:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            ImageContent = None
        except Exception as e:
            raise HTTPException(500, f"LLM lib missing: {e}")

    import base64, json as _json
    data = await file.read()
    b64 = base64.b64encode(data).decode()
    mime = file.content_type

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"menu-photo-{user['user_id']}-{uuid.uuid4().hex[:6]}",
        system_message=(
            "You are a menu-extraction expert. Given a photo of a restaurant menu (paper, chalkboard, or handwritten), "
            "extract every item you can read. For each item return: name, description (short, may be empty), price (float, "
            "strip currency symbols), category (best guess like Starters, Mains, Drinks, Desserts), veg (boolean if identifiable "
            "otherwise true), spicy_level (0-3 if identifiable otherwise 0), bestseller (false unless clearly marked). "
            "Respond ONLY with a JSON object of the shape: "
            '{"items":[{"name":"...","description":"...","price":9.99,"category":"Starters","veg":true,"spicy_level":0,"bestseller":false}]}. '
            "No prose, no code fences, no extra keys."
        ),
    ).with_model("anthropic", "claude-sonnet-4-6")

    if ImageContent is not None:
        try:
            msg = UserMessage(text="Extract every menu item from this photo. Return only the JSON.", file_contents=[ImageContent(image_base64=b64)])
        except TypeError:
            try:
                msg = UserMessage(text="Extract every menu item from this photo. Return only the JSON.", file_contents=[ImageContent(b64)])
            except TypeError:
                # Fallback if ImageContent signature differs further
                msg = UserMessage(text="Extract every menu item from this photo. Return only the JSON.", file_contents=[ImageContent(mime_type=mime, image_base64=b64)])
    else:
        # As a last-resort text-only path (unlikely to give great results but keeps endpoint functional)
        msg = UserMessage(text=f"Base64 image ({mime}) below — extract items as specified.\n{b64[:2000]}")

    try:
        text = await chat.send_message(msg)
    except Exception as e:
        raise HTTPException(500, f"AI vision error: {e}")

    # Parse JSON from response
    raw = (text or "").strip()
    # Strip code fences if any
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    # find first { and last }
    l = raw.find("{"); r = raw.rfind("}")
    if l >= 0 and r > l:
        raw = raw[l:r+1]
    try:
        parsed = _json.loads(raw)
        items = parsed.get("items", [])
    except Exception:
        items = []

    # Normalise and clamp
    cleaned = []
    for it in items:
        try:
            cleaned.append({
                "name": str(it.get("name", "")).strip(),
                "description": str(it.get("description", "") or "").strip(),
                "price": float(it.get("price") or 0),
                "category": str(it.get("category", "General")).strip() or "General",
                "veg": bool(it.get("veg", True)),
                "spicy_level": max(0, min(3, int(it.get("spicy_level", 0) or 0))),
                "bestseller": bool(it.get("bestseller", False)),
            })
        except Exception:
            continue
    return {"items": cleaned, "count": len(cleaned)}


@api.post("/items/bulk")
async def bulk_create_items(body: BulkItemsRequest, user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    # Verify category belongs to owner
    cat = await db.categories.find_one({"category_id": body.category_id, "restaurant_id": r["restaurant_id"]})
    if not cat:
        raise HTTPException(404, "Category not found")
    created = []
    for it in body.items:
        doc = {
            "item_id": f"item_{uuid.uuid4().hex[:10]}",
            "restaurant_id": r["restaurant_id"],
            "category_id": body.category_id,
            "name": str(it.get("name", "")).strip() or "Unnamed",
            "description": str(it.get("description", "") or "").strip(),
            "price": float(it.get("price") or 0),
            "image_url": it.get("image_url"),
            "veg": bool(it.get("veg", True)),
            "bestseller": bool(it.get("bestseller", False)),
            "spicy_level": int(it.get("spicy_level", 0) or 0),
            "available": True,
            "order": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "views": 0,
        }
        await db.menu_items.insert_one(doc)
        doc.pop("_id", None)
        created.append(doc)
    return {"created": len(created), "items": created}


@api.post("/categories/find-or-create")
async def find_or_create_category(request: Request, user: dict = Depends(require_owner)):
    """Helper for AI import: find category by name (case-insensitive) or create it."""
    r = await get_owner_restaurant(user)
    body = await request.json()
    name = str(body.get("name", "")).strip()
    if not name:
        raise HTTPException(400, "name required")
    existing = await db.categories.find_one({"restaurant_id": r["restaurant_id"], "name": {"$regex": f"^{name}$", "$options": "i"}}, {"_id": 0})
    if existing:
        return existing
    doc = {
        "category_id": f"cat_{uuid.uuid4().hex[:10]}",
        "restaurant_id": r["restaurant_id"],
        "name": name,
        "order": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Owner Analytics ----------
@api.get("/analytics/owner")
async def owner_analytics(user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    rid = r["restaurant_id"]
    scans = await db.qr_scans.count_documents({"restaurant_id": rid})
    orders = await db.orders.count_documents({"restaurant_id": rid})
    total_items = await db.menu_items.count_documents({"restaurant_id": rid})
    total_cats = await db.categories.count_documents({"restaurant_id": rid})
    total_tables = await db.tables.count_documents({"restaurant_id": rid})
    # last 7 days scan trend
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    trend = []
    async for s in db.qr_scans.find({"restaurant_id": rid}):
        at = s.get("at")
        try:
            d = datetime.fromisoformat(at).replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if d >= since:
            trend.append(d.strftime("%Y-%m-%d"))
    from collections import Counter
    counts = Counter(trend)
    days = []
    for i in range(7):
        d = (since + timedelta(days=i)).strftime("%Y-%m-%d")
        days.append({"day": d[-5:], "scans": counts.get(d, 0)})
    # popular items (by views placeholder — use order counts)
    pop = {}
    async for o in db.orders.find({"restaurant_id": rid}):
        for it in o.get("items", []):
            pop[it["name"]] = pop.get(it["name"], 0) + it.get("quantity", 1)
    popular = sorted([{"name": k, "count": v} for k, v in pop.items()], key=lambda x: -x["count"])[:5]
    return {
        "scans": scans, "orders": orders, "items": total_items,
        "categories": total_cats, "tables": total_tables,
        "trend": days, "popular": popular,
    }


@api.get("/orders")
async def list_orders(user: dict = Depends(require_owner)):
    r = await get_owner_restaurant(user)
    orders = await db.orders.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


# ---------- Admin ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    users = await db.users.count_documents({"role": "owner"})
    restaurants = await db.restaurants.count_documents({})
    orders = await db.orders.count_documents({})
    scans = await db.qr_scans.count_documents({})
    active = await db.users.count_documents({"role": "owner", "status": {"$ne": "suspended"}})
    plans = {}
    async for u in db.users.find({"role": "owner"}, {"_id": 0, "plan": 1}):
        p = u.get("plan", "free")
        plans[p] = plans.get(p, 0) + 1
    return {
        "users": users, "restaurants": restaurants, "orders": orders,
        "scans": scans, "active_owners": active, "plans": plans,
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_admin)):
    users = await db.users.find({"role": "owner"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    # attach restaurant slug
    for u in users:
        r = await db.restaurants.find_one({"owner_id": u["user_id"]}, {"_id": 0, "slug": 1, "name": 1})
        u["restaurant_slug"] = r.get("slug") if r else None
        u["restaurant_name"] = r.get("name") if r else None
    return users


@api.patch("/admin/users/{user_id}/plan")
async def admin_update_plan(user_id: str, body: UpdatePlanRequest, admin: dict = Depends(require_admin)):
    expires = (datetime.now(timezone.utc) + timedelta(days=body.days)).isoformat()
    res = await db.users.update_one({"user_id": user_id}, {"$set": {"plan": body.plan, "plan_expires_at": expires}})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    return {"ok": True, "plan": body.plan, "expires_at": expires}


@api.patch("/admin/users/{user_id}/status")
async def admin_update_status(user_id: str, request: Request, admin: dict = Depends(require_admin)):
    body = await request.json()
    status = body.get("status")
    if status not in ("active", "suspended"):
        raise HTTPException(400, "Invalid status")
    await db.users.update_one({"user_id": user_id}, {"$set": {"status": status}})
    return {"ok": True}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.delete_one({"user_id": user_id})
    r = await db.restaurants.find_one({"owner_id": user_id})
    if r:
        rid = r["restaurant_id"]
        await db.restaurants.delete_one({"restaurant_id": rid})
        await db.categories.delete_many({"restaurant_id": rid})
        await db.menu_items.delete_many({"restaurant_id": rid})
        await db.tables.delete_many({"restaurant_id": rid})
        await db.orders.delete_many({"restaurant_id": rid})
    return {"ok": True}


# ---------- Plans catalog (public) ----------
@api.get("/plans")
async def list_plans():
    return [
        {"id": "free", "name": "Free", "price": 0, "period": "forever", "features": [
            "1 restaurant", "20 menu items", "5 tables", "WhatsApp orders", "QR download PNG"
        ], "cta": "Start free"},
        {"id": "starter", "name": "Starter", "price": 799, "period": "month", "features": [
            "Unlimited items", "20 tables", "Analytics", "Custom colors", "QR PNG + SVG"
        ], "cta": "Pay via WhatsApp"},
        {"id": "premium", "name": "Premium", "price": 1499, "period": "month", "features": [
            "Everything in Starter", "AI descriptions", "Unlimited tables", "Priority support", "QR PDF poster"
        ], "cta": "Pay via WhatsApp", "popular": True},
        {"id": "business", "name": "Business", "price": 2999, "period": "month", "features": [
            "Multi-location", "Custom domain", "API access", "White-label", "Dedicated manager"
        ], "cta": "Pay via WhatsApp"},
    ]


@api.get("/platform-config")
async def platform_config():
    return {"whatsapp": PLATFORM_WHATSAPP, "currency": DEFAULT_CURRENCY}


@api.get("/plan/status")
async def plan_status(user: dict = Depends(get_current_user)):
    if user.get("role") == "admin":
        return {"plan": "admin", "expires_at": None, "days_remaining": None, "status": "active", "expired": False, "expiring_soon": False}
    plan = user.get("plan", "free")
    exp = user.get("plan_expires_at")
    if not exp:
        return {"plan": plan, "expires_at": None, "days_remaining": None, "status": "active", "expired": False, "expiring_soon": False}
    try:
        expires = datetime.fromisoformat(exp)
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
    except Exception:
        return {"plan": plan, "expires_at": exp, "days_remaining": None, "status": "unknown", "expired": False, "expiring_soon": False}
    delta = expires - datetime.now(timezone.utc)
    days = int(delta.total_seconds() // 86400)
    expired = days < 0
    expiring_soon = 0 <= days <= 5
    return {
        "plan": plan, "expires_at": exp, "days_remaining": max(days, 0),
        "status": "expired" if expired else "active",
        "expired": expired, "expiring_soon": expiring_soon,
        "renewal_whatsapp": PLATFORM_WHATSAPP,
    }


@api.get("/public/translate-menu/{slug}")
async def public_translate_menu(slug: str, lang: str):
    """Translate a restaurant's menu into target language using AI. Cached per (restaurant, lang)."""
    if lang == "en":
        return {"lang": "en", "translations": {}}
    r = await db.restaurants.find_one({"slug": slug}, {"_id": 0, "restaurant_id": 1})
    if not r:
        raise HTTPException(404, "Restaurant not found")
    # Try cache
    cached = await db.menu_translations.find_one({"restaurant_id": r["restaurant_id"], "lang": lang}, {"_id": 0})
    if cached and cached.get("translations"):
        return {"lang": lang, "translations": cached["translations"], "cached": True}

    # Fetch items + cats + about
    cats = await db.categories.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).to_list(500)
    items = await db.menu_items.find({"restaurant_id": r["restaurant_id"]}, {"_id": 0}).to_list(2000)
    restaurant = await db.restaurants.find_one({"restaurant_id": r["restaurant_id"]}, {"_id": 0})

    lang_map = {"hi": "Hindi", "es": "Spanish", "fr": "French", "ar": "Arabic", "de": "German", "zh": "Chinese", "ta": "Tamil", "bn": "Bengali", "mr": "Marathi", "te": "Telugu", "gu": "Gujarati"}
    target = lang_map.get(lang, lang)

    payload = {
        "tagline": restaurant.get("tagline") or "",
        "about_us": restaurant.get("about_us") or "",
        "categories": [{"id": c["category_id"], "name": c["name"]} for c in cats],
        "items": [{"id": i["item_id"], "name": i["name"], "description": i.get("description") or ""} for i in items],
    }

    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"LLM lib missing: {e}")
    import json as _json
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"trans-menu-{r['restaurant_id']}-{lang}",
        system_message=(
            f"You are a professional restaurant translator. Translate the given menu content into {target}. "
            "Preserve the JSON structure exactly. Translate 'tagline', 'about_us', each category 'name', and each item 'name' and 'description'. "
            "Keep ids unchanged. Return ONLY the JSON — no code fences, no explanation."
        ),
    ).with_model("anthropic", "claude-sonnet-4-6")
    try:
        text = await chat.send_message(UserMessage(text=_json.dumps(payload, ensure_ascii=False)))
    except Exception as e:
        raise HTTPException(500, f"AI translation error: {e}")

    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    l = raw.find("{"); rp = raw.rfind("}")
    if l >= 0 and rp > l:
        raw = raw[l:rp+1]
    try:
        parsed = _json.loads(raw)
    except Exception:
        raise HTTPException(500, "Translation format error")

    translations = {
        "tagline": parsed.get("tagline") or "",
        "about_us": parsed.get("about_us") or "",
        "categories": {c["id"]: c["name"] for c in parsed.get("categories", []) if c.get("id")},
        "items": {i["id"]: {"name": i.get("name") or "", "description": i.get("description") or ""} for i in parsed.get("items", []) if i.get("id")},
    }
    await db.menu_translations.update_one(
        {"restaurant_id": r["restaurant_id"], "lang": lang},
        {"$set": {"translations": translations, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"lang": lang, "translations": translations, "cached": False}


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "menu-maker", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()

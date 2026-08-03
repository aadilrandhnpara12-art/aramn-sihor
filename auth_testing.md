# Auth Testing Playbook — Menu Maker

## Overview
Two auth paths:
1. **JWT email/password** (default) — cookie `access_token`, also `token` field in JSON response.
2. **Emergent Google Auth** — user returns from Google with `#session_id=...` hash; frontend `/auth/callback` posts it to `POST /api/auth/google/session`.

## Test Admin
- Email: aadilrandhnpara12@gmail.com
- Password: Admin@12345
- Role: admin

## Backend cURL

### Register a new owner
```
curl -c cookies.txt -X POST $URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"owner1@test.com","password":"pass1234","name":"Owner One","restaurant_name":"Neon Diner"}'
```

### Login
```
curl -c cookies.txt -X POST $URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aadilrandhnpara12@gmail.com","password":"Admin@12345"}'
```

### Fetch current user
```
curl -b cookies.txt $URL/api/auth/me
```

### Menu CRUD
```
curl -b cookies.txt $URL/api/categories
curl -b cookies.txt -X POST $URL/api/categories -H "Content-Type: application/json" -d '{"name":"Starters","order":1}'
```

### Public menu
```
curl $URL/api/public/restaurant/neon-diner
```

## Frontend
- Login page: /login
- Register: /register
- Owner dashboard: /dashboard (requires role=owner or admin)
- Super Admin: /admin (requires role=admin)
- Public menu: /r/:slug
- Auth callback: any route with `#session_id=xxxx` will trigger callback handler

## Success indicators
- /api/auth/me returns user object with `user_id`, `email`, `role`, and (if owner) `restaurant_slug`.
- Cookie `access_token` is set httpOnly, secure, samesite=none, path=/.
- Suspended users get 403 on login.

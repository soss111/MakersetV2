You are building a new, production-ready v2 of “MakerSet Receipt Hub” from scratch.

## Product goal
One web app + one API for managing and selling maker/STEM “sets” with multi-role workflows:
- Admin manages catalog, providers, orders, settings, reporting.
- Provider publishes sets for sale (price/stock), fulfills orders, receives invoices/reports.
- Customer browses provider listings, adds to cart, checks out, views orders, leaves ratings.
- Production (optional) handles packing/fulfillment dashboards and packing lists.

## Non-functional requirements (must-have)
- Stability: all endpoints must return a valid HTTP response + JSON (no “status 0”).
- Observability: structured logs per request with requestId; safe error details.
- Security: JWT auth, role checks, bcrypt password hashing, rate limit auth endpoints, safe SQL.
- Performance: pagination for lists; avoid N+1; cache settings; reuse DB connections.
- DX: single source of truth for API base URL; no scattered env checks in UI.

## Canonical Postgres schema (minimum)
- users(user_id, username, email, password_hash, role, first_name, last_name, company_name, provider_markup_percentage, provider_code, is_active, created_at, updated_at, last_login)
- system_settings(setting_key UNIQUE, setting_value, setting_type, category, description, updated_at)
- parts(part_id, part_number UNIQUE, part_name, category, stock_quantity, unit_cost, safety_notes, image_url, translations JSON/text, active)
- tools(tool_id, tool_number UNIQUE, tool_name, category, stock_quantity, unit_cost, safety_instructions, image_url, translations JSON/text, active)
- sets(set_id, name, description, category, difficulty_level, age_min/max, duration, base_price, video_url, learning_outcomes, active, admin_visible)
- set_parts(set_part_id, set_id, part_id, quantity, is_optional, notes, safety_notes)
- provider_sets(provider_set_id, provider_id, set_id UNIQUE(provider_id,set_id), price, available_quantity, is_active, provider_visible, admin_visible, admin_status, admin_notes)
- orders(order_id, order_number UNIQUE, customer_id, provider_id, status, total_amount, currency, shipping_address, printed, created_at, updated_at)
- order_items(order_item_id, order_id, set_id, quantity, unit_price, line_total)

## API conventions (REST under /api)
- Auth header: Authorization: Bearer <jwt> for protected endpoints.
- JSON envelope: { success, data?, error?, details? }.
- Pagination: ?page=&limit= and return pagination { page, limit, total, pages }.
- Filtering: query params (status, provider_id, customer_id, search, etc.).
- Errors: 400 validation, 401 auth, 403 role, 404 not found, 409 conflict, 500 internal.

## Required endpoints (core)
Auth:
- POST /auth/register → { token, user }
- POST /auth/login → { token, user }
- GET /auth/profile → { user } (current user from JWT)
- PUT /auth/profile → { user }
- PUT /auth/change-password → { success }

Settings:
- GET /settings (admin) → all settings as object
- GET /settings/:key → { setting, value }
- PUT /settings/:key (admin) → upsert { value, type, description? }

Catalog:
- parts: GET|POST /parts, GET|PUT|DELETE /parts/:id
- tools: GET|POST /tools, GET|PUT|DELETE /tools/:id
- sets: GET|POST /sets, GET|PUT|DELETE /sets/:id
- set parts: GET|POST /set-parts, GET|PUT|DELETE /set-parts/:id
- set tools: GET|POST /set-tools, GET|PUT|DELETE /set-tools/:id (optional)

Provider sets:
- GET /provider-sets (filter by provider_id; role-gated)
- POST /provider-sets
- PUT /provider-sets/:id
- Admin status update: PUT /provider-sets/:id/status OR PUT /admin/provider-sets/:id/status

Shop + orders:
- GET /shop-sets (customer-facing provider_sets)
- POST /orders (checkout)
- GET /orders (role filtered)
- GET /orders/:id (with items)
- PUT /orders/:id (status/printed updates)

Ratings (optional but used in UI):
- POST /ratings
- GET /ratings/set/:setId

Invoices + reporting (optional but used in UI):
- POST /provider-payments/invoice/:providerId
- POST /provider-payments/email-invoice and /provider-payments/email-invoice/:providerId
- GET /provider-payments/monthly-reports
- POST /provider-payments/generate-monthly-reports

Dashboards/system:
- GET /dashboard/stats
- GET /system/alerts (optional)
- GET /health

## Frontend requirements
- React + TypeScript + React Router + MUI.
- AuthContext stores authToken; hydrate via GET /auth/profile.
- All network calls use ONE client: axios with baseURL from getApiBaseUrl() or apiFetch().
- Use ErrorBoundary + health banner when API is down.
- Route map: public (shop, login, register), customer (account, orders), provider (dashboards, payments), admin (dashboard, users, catalog, set builder, provider management, system settings), production (optional).

## Backend requirements
- Prefer serverless (Netlify/Lambda): one function per resource + shared libs.
- DB: Postgres only in production; require DATABASE_URL/NETLIFY_DATABASE_URL.
- Every handler wrapped so thrown errors become valid 500 JSON responses.
- Env: DATABASE_URL, JWT_SECRET, optional JWT_EXPIRES_IN, email creds for invoice emails.

## Build plan (recommended)
1) Schema + migrations + seed (admin user, default settings).
2) Auth + role middleware.
3) CRUD (sets/parts/tools + set_parts).
4) Provider sets + shop listing.
5) Orders + order items.
6) Settings + dashboards.
7) Optional modules: ratings, invoices, monthly reports, notifications, AI.
8) Harden: caching, logging, rate limits, tests.
```

---

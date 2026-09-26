# StockSense — Inventory, in real time.

A full-stack, real-time Inventory Management System (MERN + TypeScript): receipts, deliveries, internal transfers, adjustments, per-location stock, an append-only stock ledger, low-stock alerts and a premium SaaS UI.

## Quick start

```bash
npm install
npm run db          # local MongoDB replica set on :27018 (no Docker)  — or: docker compose up -d
npm run seed        # demo data (drops & rebuilds the stocksense database)
npm run dev         # API http://localhost:5000 · client http://localhost:5173
```

`npm run dev:local` starts the DB, API and client together.

**Seed logins:** `admin01 / Admin@1234` (admin) · `manager1 / Manager@1234` (manager) · `staff01 / Staff@1234` (staff)

## Requirements

- Node.js 20+
- MongoDB **replica set** (transactions). Options: `npm run db` (bundled mongod, data in `.mongo-data/`), `docker compose up -d` (MongoDB 7 rs0 + mongo-express on :8081, admin/stocksense), or Atlas. The API refuses to start on a standalone server.

## Environment (`server/.env`, see `server/.env.example`)

| Variable | Default | Notes |
| --- | --- | --- |
| `MONGO_URI` | `mongodb://127.0.0.1:27018/stocksense?directConnection=true` | must be a replica set |
| `PORT` / `CLIENT_URL` | `5000` / `http://localhost:5173` | CORS origin |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | dev fallbacks | **required (32+ chars) in production** |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | `15m` / `7d` | |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | empty | empty host → OTP emails are printed to the API console |

Client: `client/.env` `VITE_API_URL=/api/v1` (Vite proxies `/api`, `/uploads`, `/socket.io`).

## Scripts

| Script | |
| --- | --- |
| `npm run dev` / `dev:local` | API + client (+ DB) |
| `npm run seed` | 42 operations, 58 ledger moves, 30 products, 2 warehouses, reorder rules, notifications |
| `npm test` | server Jest + Supertest on an in-memory replica set (50 tests) · client Vitest + RTL |
| `npm run lint` / `npm run typecheck` / `npm run build` | both apps |

## Architecture

```
server/src  config (env, db, logger, mailer) · models · services (business logic) · controllers (thin)
            routes · middlewares (auth, requireRole, validate, sanitize, rateLimit, upload, error)
            validators (Zod) · sockets · seed · utils
client/src  app (router, session/realtime, navigation) · layouts · components/ui (shadcn) · components/common
            features/{landing,auth,dashboard,operations,stock,move-history,settings,profile,notifications,master}
            lib (axios w/ single-flight refresh, api, socket, queryKeys, format, types) · store (Zustand)
docs        MOCKUP.md (mockup transcription) · DESIGN.md (UI brief)
```

**Models:** User, Otp, RefreshToken, Warehouse, Location, Category, Product, StockQuant (unique product+location), ReorderRule, Contact, Operation, StockMove (append-only), Counter, Notification.

## How inventory works

- **StockQuant** holds `onHand` and `reserved` per product per internal location; `freeToUse = onHand − reserved`. Every mutation is a guarded conditional update inside a MongoDB transaction, so stock can never go negative.
- **References** `<WH>/<IN|OUT|INT|ADJ>/<0001>` come from an atomic per-warehouse counter (20 concurrent creates → unique, sequential).
- **Receipt** Draft → (To Do) Ready → (Validate) Done: Vendor → location, stock +.
- **Delivery** Draft → Check Availability → Ready (stock reserved) or Waiting (short lines flagged, notification). Ready → Pick → Pack → Validate → Done: stock −. When stock arrives at a location, Waiting deliveries there are re-checked oldest-first and flip to Ready automatically.
- **Internal transfer** Draft → Ready (source reserved) → Done: source −, destination +, total unchanged; From ≠ To.
- **Adjustment** counted vs recorded → difference posted to/from `Virtual/Adjustment` as a Done `WH/ADJ` with a reason. Inline edits on the Stock page and product initial stock use the same path.
- **Validate** = one transaction: update quants, insert one StockMove per line, mark Done + doneDate; after commit: Socket.IO events, low/out-of-stock checks (de-duplicated 24 h), waiting re-checks.
- **Cancel** before Done releases reservations. Done operations are locked. Invalid transitions → 409. Print (PDF) only when Done.
- **Late** = scheduled before today and not done/canceled; an hourly job creates late notifications.

## Authentication & RBAC

httpOnly cookies: 15-min access JWT + 7-day refresh token (stored hashed, rotated on every refresh, reuse → whole family revoked, logout revokes). bcrypt cost 12. Sign-up rules: login ID unique 6–12, unique email, password > 8 chars with lower, upper and special. Failed login → exactly "Invalid Login Id or Password". OTP reset: 6 digits, hashed, 10-min expiry, 60 s resend cooldown, 5 attempts, resets revoke all sessions.

| Role | Can |
| --- | --- |
| staff | view stock / operations / moves; create & process receipts, deliveries, transfers |
| manager | + products, categories, contacts, reorder rules, adjustments, stock edits |
| admin | + warehouses, locations, users |

Enforced by the API (`requireRole` → 403); the UI hides what a role can't use.

## API (`/api/v1`, responses `{ success, data, message, meta }`, errors `{ success:false, message, errors:[{field,message}] }`)

`/auth` signup · login · logout · refresh · me · forgot-password · verify-otp · reset-password · check-login-id · check-email
`/dashboard` summary · charts · recent
`/operations` list · kanban · create · get · patch · `:id/todo` · `check-availability` · `pick` · `pack` · `validate` · `cancel` · `PATCH :id/status` · `:id/print` (PDF)
`/stock` list · `:productId/locations` · `PATCH :productId` (adjustment)
`/moves` list · kanban · export.csv
CRUD: `/products` `/categories` `/contacts` `/reorder-rules` `/warehouses` `/locations` `/users` · `/notifications` · `/users/me` (profile, password, avatar, activity)
Socket.IO (cookie-authenticated): `stock:updated`, `operation:updated`, `dashboard:refresh`, `alert:lowstock`, `notification:new`.

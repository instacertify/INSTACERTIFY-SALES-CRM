# Instacertify CRM — Modular Monolith

Project-centric certification CRM for Instacertify.

## Architecture

```text
CRM (modular monolith)
├── apps/web     Next.js + TypeScript + Tailwind (UI)
├── apps/api     NestJS + TypeScript (business logic)
└── packages/database   Prisma + PostgreSQL schema
```

**Not microservices.** One NestJS app, one PostgreSQL database, Redis for queues/cache.

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind |
| Backend | NestJS modular monolith |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (Auth.js-ready; Nest issues tokens) |
| Cache / jobs | Redis + BullMQ |
| Files | Local now; S3-compatible ready (`storageKey`) |
| Deploy | Docker Compose + Nginx/Caddy + Cloudflare |

### Domain flow

```text
LEAD → CUSTOMER → OPPORTUNITY → QUOTATION → PROJECT
  → SERVICE / LAB / TESTING / DOCUMENTS → CERTIFICATION → DELIVERY → PAYMENT
```

A customer (e.g. Midea Vietnam) can own many projects (BIS, WPC, EPR, Testing…).  
Each project holds products, manufacturer, applicant, standards, testing, samples, queries, fees, tasks, and renewal.

## Quick start (local)

### 1. Postgres + Redis

```bash
# Postgres (example local)
# user/pass/db: instacertify / instacertify / instacertify

redis-server --daemonize yes
```

Or:

```bash
docker compose up -d postgres redis
```

### 2. Install & seed

```bash
cp .env.example .env
npm install
npm run db:setup
```

### 3. Run API + Web

```bash
npm run dev:api   # http://localhost:4000/api/v1
npm run dev:web   # http://localhost:3000
```

### Logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@instacertify.in` | `Admin@123` |
| Sales | `sales@instacertify.in` | `Sales@123` |

## API modules (`apps/api`)

`auth` · `users/employees` · `leads` · `customers/contacts` · `opportunities` · `quotations` · `projects` (control tower) · `tasks` · `certification` · `testing` · `samples` · `documents` · `invoices/payments` · `notifications` · `reports` · `admin`

Health: `GET /api/v1/admin/health`

## Seed demo account

**Midea Vietnam** with BIS / WPC / EPR projects, testing order, sample shipment, and certification record.

## Docker

```bash
docker compose up --build
```

## Notes

- `instacertify_crm/` is a legacy ERPNext experiment — not the production path.
- Prefer growing Nest modules inside this monolith before extracting services.

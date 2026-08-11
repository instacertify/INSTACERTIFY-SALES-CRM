# Instacertify ERP — Cert + Testing Modular Monolith

Standalone **ERP** for certification consulting that **bundles testing**: CRM, delivery, finance, vendors and light HR.

**Stack:** Next.js + NestJS + PostgreSQL (no ERPNext / Docker).

**Deploy:** Hostinger VPS with PM2 + Nginx, or Hostinger Node (`server.mjs`).

## Product modules

| Area | What employees get |
|---|---|
| Customers | Account master, contacts, journey, portals |
| Leads → Opportunities → Quotations | Convert lead; accept quote → **project + invoice** |
| Testing catalog | Lab scope, purchase vs sell price, margin |
| Projects / Tasks / Samples | Delivery control tower + sample logistics |
| Documents | File registry + customer checklist portals |
| Finance | Invoices, payments, AR aging, expenses, POs |
| Vendors | Labs, couriers, suppliers |
| Team / HR | Users, roles, department, light CTC |
| Reports | Sales by person, testing margin, AR, expenses |

```text
LEAD → CUSTOMER → OPPORTUNITY → QUOTATION (consulting + testing lines)
  → PROJECT → DOCUMENTS / TEST REQUEST → LAB → CERTIFICATION → PAYMENT
```

## Stack (standalone)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js + TypeScript | Fast modern UI |
| UI | Tailwind CSS (+ shadcn-style primitives) | Clean admin screens, rapid UI |
| Backend | NestJS + TypeScript | Structured APIs, scalable business rules |
| Database | PostgreSQL | Relational CRM / project data |
| ORM | Prisma | Easy schema + migrations |
| Authentication | Nest JWT (Auth.js / Keycloak ready) | Role & session management |
| File storage | Local now; **S3-compatible** when configured | Certificates, reports, invoices, docs |
| Cache / Queue | Redis + BullMQ (**optional**) | Notifications, reminders, jobs |
| Search | PostgreSQL (`contains` / indexes) | Fast catalog & customer search; Meilisearch later |
| Notifications | In-app now; Email + WhatsApp API hooks | Client follow-ups |
| Monitoring | Sentry env hooks | Errors |
| Analytics | PostHog env hooks | Product / user activity |
| Version control | GitHub | Code, CI/CD, issues |
| Deploy | Hostinger VPS + PM2 + Nginx | Simple, no Docker |

```text
instacertify-crm/
├── apps/web                 Next.js UI + customer portals
├── apps/api                 NestJS modular monolith API
├── packages/database        Prisma schema + seed
├── ecosystem.config.cjs     PM2
└── scripts/hostinger-*.sh   VPS setup / deploy
```

## Key screens

- `/dashboard` — pie charts + person sales value  
- `/testing` — lab scope & sell prices  
- `/customers/[id]` — journey, checklists, test requests, work done  
- `/work-library` — interactive client work map  
- `/portal/docs/:token` — customer document checklist  
- `/portal/test-request/:token` — customer test request form  

## Hostinger deploy (no Docker)

### Option A — Hostinger Node.js Application (hPanel)

**503 cause (fixed):** Hostinger only proxies to `process.env.PORT` on `0.0.0.0`. The old starter ran Next/Nest incorrectly and/or used `PORT=4000` from `.env`, so the proxy could not reach the app.

In hPanel → Websites → Node.js / Web Apps, set:

| Setting | Value |
|---|---|
| Application type | **`other`** |
| Root directory | `/` |
| Node.js version | **20+** |
| Build script | `build` |
| Output directory | `.next` |
| Entry file | **`server.js`** (required — Hostinger LiteSpeed `require()`s this file) |

**Environment variables (critical):**

| Key | Value |
|---|---|
| `DATABASE_URL` | your Postgres URL |
| `JWT_SECRET` | long random string |
| `API_PORT` | `4000` |
| `NEXT_PUBLIC_API_URL` | `/api/v1` |
| `CORS_ORIGIN` | `https://your-domain` |
| `ENABLE_REDIS` | `false` |
| ~~`PORT`~~ | **Do not set** — Hostinger injects it |

`server.mjs` listens on Hostinger’s `PORT`, serves Next, and proxies `/api/*` → Nest on `API_PORT`.

After deploy: open **Runtime Logs**. You should see `[hostinger] Listening on http://0.0.0.0:<port>`. Run `npm run db:setup` once (SSH or one-off) if the DB is empty.

Deprecation warnings for `glob` / `inflight` are harmless.

### Option B — VPS + PM2 + Nginx (recommended)

```bash
git clone <repo> /var/www/instacertify-crm
cd /var/www/instacertify-crm
bash scripts/hostinger-setup.sh
cp .env.example .env && nano .env
bash scripts/hostinger-deploy.sh
sudo certbot --nginx -d crm.instacertify.in
```

Nginx: `/` → web `:3000`, `/api/` → API `:4000`.

## Local development

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev:api   # :4000/api/v1
npm run dev:web   # :3000
```

| Role | Email | Password |
|---|---|---|
| Admin | `admin@instacertify.in` | `Admin@123` |
| Sales | `sales@instacertify.in` | `Sales@123` |

## API surface (high level)

`auth` · `catalog` (labs/testing/services) · `customers` (+ `/journey`) · `quotations` · `projects` · `document-requests` · `test-requests` · `work-library` · `reports/dashboard` · `public/*` portals

Health: `GET /api/v1/admin/health`

## Optional production switches

```bash
ENABLE_REDIS=true          # BullMQ jobs
FILE_STORAGE=s3            # S3-compatible uploads
SENTRY_DSN=...             # error tracking
NEXT_PUBLIC_POSTHOG_KEY=...
```

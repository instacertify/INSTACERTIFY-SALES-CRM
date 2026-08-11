# Instacertify CRM — Fast Standalone Modular Monolith

Standalone CRM for **selling certification consulting** that **bundles testing and other services**, with a strong focus on **testing sales**.

**ERPNext / Frappe has been removed.** This repo is Next.js + NestJS + PostgreSQL only.

**Deploy:** Hostinger VPS with PM2 + Nginx — **no Docker**.

## Product focus

| Area | What employees get |
|---|---|
| Testing catalog | Search **lab scope**, see **purchase price** vs **sell-at price** |
| Customer journey | Quotes **shared → revised → testing opted → accepted** |
| Document portal | Collect **service document checklists** from customers |
| Test request portal | Customer fills **test request form**; employee **downloads lab pack** |
| Work library | Interactive map of work done for each client |
| Dashboard | **Pie charts** + **sales value by person** |

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

The monorepo builds Next into `apps/web/.next`. Root `npm run build` also links that output to **`.next`** at the repo root so Hostinger’s “output directory” check passes.

In hPanel → Websites → Node.js, set:

| Setting | Value |
|---|---|
| Node.js version | **20** (or newer) |
| Build command | `npm run build` |
| Output directory | `.next` |
| Start command | `npm start` |

`npm start` boots the Nest API (port **4000**) and Next.js (port **3000** / `PORT`). Set env vars in hPanel (at least `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`). Run DB setup once over SSH or a one-off job: `npm run db:setup`.

Deprecation warnings for `glob` / `inflight` during install are harmless and not the deploy failure.

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

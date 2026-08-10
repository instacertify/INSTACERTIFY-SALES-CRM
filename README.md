# Instacertify CRM — Modular Monolith

Project-centric certification CRM for Instacertify.

**Deploy target: Hostinger VPS with PM2 + Nginx — no Docker.**

## Architecture

```text
CRM (modular monolith)
├── apps/web     Next.js + TypeScript + Tailwind (UI)
├── apps/api     NestJS + TypeScript (business logic)
└── packages/database   Prisma + PostgreSQL schema
```

One NestJS app + one PostgreSQL database. Redis is **optional** (`ENABLE_REDIS=false` by default) so Hostinger stays simple.

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind |
| Backend | NestJS modular monolith |
| Database | PostgreSQL (apt on VPS) |
| ORM | Prisma |
| Auth | JWT |
| Process manager | PM2 |
| Reverse proxy | Nginx (+ Cloudflare DNS optional) |
| Deploy | **Hostinger VPS — no Docker** |

### Domain flow

```text
LEAD → CUSTOMER → OPPORTUNITY → QUOTATION → PROJECT
  → TESTING / SAMPLES / DOCUMENTS → CERTIFICATION → DELIVERY → PAYMENT
```

## Hostinger deployment (recommended)

Use a **Hostinger VPS** (Ubuntu 22.04/24.04). Shared hosting is not suitable for NestJS + PostgreSQL.

### 1) One-time server setup

```bash
# SSH into your Hostinger VPS, then:
sudo apt-get update
git clone <your-repo-url> /var/www/instacertify-crm
cd /var/www/instacertify-crm
bash scripts/hostinger-setup.sh
```

This installs Node 22, PostgreSQL, Nginx, and PM2 (**not Docker**), creates the DB, and configures Nginx:

- `https://your-domain/` → Next.js (`:3000`)
- `https://your-domain/api/` → NestJS (`:4000`)

### 2) Configure env

```bash
cd /var/www/instacertify-crm
cp .env.example .env
nano .env
```

Set at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN=https://your-domain`
- `NEXT_PUBLIC_API_URL=https://your-domain/api/v1`
- `ENABLE_REDIS=false`

### 3) Deploy / update

```bash
cd /var/www/instacertify-crm
git pull
bash scripts/hostinger-deploy.sh
```

### 4) SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d crm.instacertify.in
```

### Useful PM2 commands

```bash
pm2 status
pm2 logs
pm2 restart all
```

## Local development (also no Docker)

```bash
# PostgreSQL running locally (apt / Hostinger remote DB)
cp .env.example .env
npm install
npm run db:setup
npm run dev:api   # http://localhost:4000/api/v1
npm run dev:web   # http://localhost:3000
```

### Seed logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@instacertify.in` | `Admin@123` |
| Sales | `sales@instacertify.in` | `Sales@123` |

## API modules

`auth` · `users` · `leads` · `customers` · `opportunities` · `quotations` · `projects` · `tasks` · `certification` · `testing` · `samples` · `documents` · `invoices` · `notifications` · `reports` · `admin`

Health: `GET /api/v1/admin/health`

## Notes

- **Do not use Docker** for this project’s Hostinger path — PM2 + Nginx is enough for a 3–10 person team.
- Redis/BullMQ can be enabled later with `ENABLE_REDIS=true` if you need background jobs.
- Legacy `instacertify_crm/` ERPNext folder is not used for production.

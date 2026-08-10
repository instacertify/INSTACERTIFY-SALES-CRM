# Instacertify Sales CRM (Next.js)

Complete sales & operations CRM for **Instacertify Labs**, built with **Next.js**, **Tailwind CSS**, **Prisma**, and **NextAuth**.

## Stack

- Next.js (App Router) + React
- Tailwind CSS for UI
- Prisma + SQLite (swap `DATABASE_URL` for Postgres in production)
- NextAuth credentials login

## Features

- **Dashboard** — pipeline stats, 14-day activity chart, project control overview
- **Customers** — company profiles, lifetime value, linked leads/projects/quotes
- **Leads** — sources, ownership, expected value, status pipeline (`NEW` → `WON`/`LOST`)
- **Sales / Quotes** — letterhead quotes, public accept/revise links, QR
- **Projects** — control tower with commercial + delivery owners, waiting-for, remarks
- **Tasks** — TODO / IN_PROGRESS / WAITING / COMPLETED with waiting-for parties
- **Documents, Testing, Reports, Templates, Admin**

## Quick start

```bash
npm install
cp .env.example .env   # if present, or set DATABASE_URL + NEXTAUTH_SECRET
npm run db:setup       # prisma db push + seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed logins

| Role  | Email                   | Password   |
|-------|-------------------------|------------|
| Admin | `admin@instacertify.in` | `Admin@123` |
| Sales | `sales@instacertify.in` | `Sales@123` |

## Scripts

```bash
npm run dev        # development
npm run build      # production build
npm run start      # production server
npm run db:push    # sync schema
npm run db:seed    # seed users/services/sample CRM data
```

## Customer portals

- `/q/<token>` — quote accept / revise / print  
- `/d/<token>` — document uploads  
- `/r/<token>` — report ready download  

## Note on `instacertify_crm/`

The `instacertify_crm/` folder is a legacy ERPNext experiment and is **not** the production path. Use this Next.js app.

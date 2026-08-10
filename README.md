# Instacertify Sales CRM

Simple sales & operations CRM for [Instacertify](https://instacertify.in) — leads, follow-ups, branded quotes with scannable QR links, templates, document collection, and testing price library.

## Features

- **Leads** from Consultant, Google Ads, Phone Call, IndiaMART, Referral (admin can add more)
- Company size, country, and **India state** dropdown
- **Admin** vs **Sales & Operations** roles (Excel export for admin only)
- **Operations**: lead status, follow-up reminders, last contact, conversation logs
- **Quotes** with unique IDs, Instacertify letterhead, Google Lens–scannable QR URL
- Quote commercials: consulting, testing, other commercials (included in revenue), banking details
- **Templates** shared across team; bank details on templates editable by admin only
- Customer **accept / revise** on public quote link (print/download supported)
- After acceptance: share **document checklist** by service; customer upload + final confirm
- Team can download uploads and notify customer for missing/extra documents
- **Testing library**: purchase price admin-only; sales price + lab visible to sales/ops

## Quick start

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default logins

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@instacertify.in` | `Admin@123` |
| Sales & Ops | `sales@instacertify.in` | `Sales@123` |

## Production notes

- Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `APP_URL` to your `instacertify.in` host
- SQLite is used by default (`prisma/dev.db`). Switch `DATABASE_URL` to Postgres for multi-instance hosting
- Uploaded customer files are stored under `/uploads`
- Change default passwords after first login

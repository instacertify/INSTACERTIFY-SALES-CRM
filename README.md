# Instacertify ERP — pure ERPNext 16

Consulting + testing operations ERP for **Instacertify**, built as a Frappe custom app on official **ERPNext `version-16`**.

No NestJS / Next.js runtime. Desk, workflows, print formats, and customer portals are native ERPNext.

## Stack

| Layer | Source |
|-------|--------|
| Framework | [Frappe](https://github.com/frappe/frappe) `version-16` |
| ERP | [ERPNext](https://github.com/frappe/erpnext) `version-16` |
| Custom app | `instacertify_crm/` (this repo) |

Verified target: **Frappe 16.x + ERPNext 16.x** (Python 3.14+, Node 24+, MariaDB, Redis).

## Quick install

```bash
./scripts/setup_erpnext16_bench.sh
```

Or manually:

```bash
bench init --frappe-branch version-16 frappe-bench
cd frappe-bench
bench get-app erpnext --branch version-16 https://github.com/frappe/erpnext.git
bench new-site instacertify.local --admin-password 'Admin@123' --set-default
bench --site instacertify.local install-app erpnext

# from this repo
bench get-app /path/to/INSTACERTIFY-SALES-CRM/instacertify_crm
# or: ln -s /path/to/INSTACERTIFY-SALES-CRM/instacertify_crm apps/instacertify_crm && ./env/bin/pip install -e apps/instacertify_crm
bench --site instacertify.local install-app instacertify_crm
bench --site instacertify.local migrate
bench build --app instacertify_crm
bench serve --port 8000
```

Open Desk → **Instacertify CRM** workspace. Assign roles to users.

## Roles

| Role | Purpose |
|------|---------|
| **IC Admin** | Oversees all data; Excel / export wherever permissions allow |
| **IC All Ops Manager** | Views everything; authorises operations users |
| **IC Operations Manager** | Projects, working hours, customer records, samples |
| **IC Sales Person** | Quotes from templates, assigned customers & closed-deal progress |
| **IC Sales Ops** | Legacy alias (still seeded for older sites) |

## What the app covers

**CRM & quotes**
- Leads with company size, India→state, request type (Service / Testing / Certificate Renewal), lead source (Google, Direct Call, Lead Generated, Referral, IndiaMART, Consultant library), GST, address, expected timeline
- Quotation templates (reuse finalized formats from dropdown)
- Service quotes: certification timeline, consulting rows, government fees, testing charges with **Payable To** (Instacertify / Government Portal / Lab Direct)
- Revenue = consulting + lab/testing (gov fees only if marked)
- Force majeure, T&Cs, banking, unique QR / barcode on public quote
- Share via `/q/<token>` → customer Accept or request revision with remarks → notifies owner + IC Admin
- Accept → start **IC Customer Project** mapped to customer

**Labs & testing**
- Lab Library (contacts, location, accreditation, scope, certificates)
- Testing catalog with purchase vs sell price
- Sample Request lifecycle + QR tracking link `/s/<token>`
- Report share portals `/r/<token>`

**Customer records**
- Projects, delivery records, progress remarks, deliverable uploads
- Portal login credentials, commitments / incidents
- Document checklist portal `/d/<token>` after quote confirm
- Past quotes / reports on lead & quote

**Org**
- Asset Register (auto asset code, custodian, value)
- Holiday calendar
- Employee Profile (joining letter + QR `/emp/<token>`), salary slips download, attendance
- Admin approves HR profiles

**Desk**
- Colorful Instacertify **blue (#0A4A6C) + orange (#EB7D2D)** greeting strip with personal pending counts
- Workspace shortcuts for CRM, delivery, libraries, HR, assets
- Admin reports: Team Workload, Lead Cost Spend (exportable)

## Customer portals

| Flow | URL |
|------|-----|
| Quote accept / revise / print | `/q/<public_token>` |
| Document checklist upload | `/d/<public_token>` |
| Report ready | `/r/<public_token>` |
| Sample tracking (QR) | `/s/<public_token>` |
| Joining letter QR | `/emp/<public_token>` |

## Repo layout

```text
instacertify_crm/          Frappe app (install this on the bench)
scripts/setup_erpnext16_bench.sh
scripts/generate_frappe_doctypes.py
scripts/extend_erpnext16_doctypes.py
```

App docs: [`instacertify_crm/README.md`](./instacertify_crm/README.md)

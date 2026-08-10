# Instacertify CRM — ERPNext 16 custom app

Built on the official **[ERPNext](https://github.com/frappe/erpnext.git)** framework (`version-16`).

Verified against:

| App | Version | Branch / Source |
|-----|---------|-----------------|
| Frappe | 16.30.0 | `version-16` |
| ERPNext | 16.31.1 | `https://github.com/frappe/erpnext.git` @ `version-16` |
| Instacertify CRM | 0.0.1 | this folder |

## What you get

- **Leads** with sources (Consultant, Google Ads, Phone Call, IndiaMART, Referral), company size, India state
- Roles **IC Admin** (export) and **IC Sales Ops** (no export)
- **Quotes** with Testing / Service templates, Instacertify letterhead + public `/q/<token>` (QR to open online quote)
- Customer **Accept / Revise**
- Quote templates learned from Instacertify Testing & Service letter formats
- Customer **past history** on lead/quote (services, testing, reports)
- After accept: **select documents** and share upload link `/d/<token>`
- Final report ready portal `/r/<token>`
- **Customer lifecycle** — projects, delivery records, reports shared, customer data received, and project remarks
- Testing library — purchase price admin-only; customers only see selling price

## Install on an ERPNext 16 bench

```bash
# 1) Create bench with Frappe v16 + official ERPNext
bench init --frappe-branch version-16 frappe-bench
cd frappe-bench
bench get-app erpnext --branch version-16 https://github.com/frappe/erpnext.git
bench new-site instacertify.local --admin-password 'Admin@123' --set-default
bench --site instacertify.local install-app erpnext

# 2) Install this custom app
bench get-app /path/to/INSTACERTIFY-SALES-CRM/instacertify_crm
# or: ln -s /path/to/INSTACERTIFY-SALES-CRM/instacertify_crm apps/instacertify_crm
#     ./env/bin/pip install -e apps/instacertify_crm
bench --site instacertify.local install-app instacertify_crm
bench --site instacertify.local migrate
bench build --app instacertify_crm
bench serve --port 8000
```

Helper script from the repo root:

```bash
./scripts/setup_erpnext16_bench.sh
```

## Roles

Assign to users after install:

| Role | Access |
|------|--------|
| `IC Admin` | All CRM data + export; **Team Workload** report + assignment alerts |
| `IC Sales Ops` | All CRM data, no export; purchase price hidden |

Open the **Instacertify CRM** workspace from Desk. Admins can open **Team Workload** to see how many active leads each team member is working on (by Assigned To / Owner, with status breakup and chart).

Upload logos in **Branding / Logo** (`IC Settings`) — company logo, optional letterhead logo, favicon. Saving syncs quote letterhead, customer portals, Website Settings, and the Instacertify Letter Head.

## Customer portals

| Flow | URL |
|------|-----|
| Quote | `https://your-site/q/<public_token>` |
| Documents | `https://your-site/d/<public_token>` |
| Report ready | `https://your-site/r/<public_token>` |

On **IC Quote** choose **Quote For = Testing or Service**, apply a template, then **Share / Reshare Quote**.
After **Accepted**, use **Select Documents & Share** to pick the checklist and send the customer upload link.
Use **Customer History** on Lead/Quote to see past testing, services and reports.

### Customer lifecycle

Track everything delivered to / received from the customer across the engagement:

| Record | Purpose |
|--------|---------|
| **IC Customer Project** | One project per open engagement — scope, lifecycle status, remarks timeline |
| **IC Delivery Record** | Log service delivered, quote service delivered, reports shared, certificates, or customer data received (with attachment) |

- On Lead / Quote: **Customer Lifecycle**, **Open / Create Project**, **Log Delivery Record**
- On accepted Quote: **Mark Service Delivered** (creates delivery + sets project to Delivered)
- Reports marked Ready and customer document uploads are logged automatically
- Workspace shortcuts: **Customer Projects**, **Delivery Records**

## Requirements

- Python **≥ 3.14** (ERPNext 16)
- Node **24+**
- MariaDB + Redis
- `frappe-bench`

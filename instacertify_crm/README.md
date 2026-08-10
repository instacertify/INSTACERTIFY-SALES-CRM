# Instacertify CRM (ERPNext 16)

Custom Frappe app for **ERPNext / Frappe version-16** that implements the Instacertify sales & operations CRM:

- Leads (sources, company size, India state, follow-ups, conversation logs)
- Roles: **IC Admin** (Excel/export) and **IC Sales Ops** (no export)
- Quotes with Instacertify letterhead print format + public `/q/<token>` link (QR / Google Lens)
- Customer Accept / Revise on the public quote page
- Quote templates (bank master editable by admin only)
- Document checklist share + customer upload (`/d/<token>`)
- Final report upload + customer “report ready” link (`/r/<token>`)
- Testing price library — **purchase price admin-only**; customers/quotes only use **selling price**

Your existing EPR Plastic quote PDF was generated from Frappe print formats — this app continues on that stack instead of a separate Next.js CRM.

## Requirements

- ERPNext **version-16** bench (Frappe v16)
- Python / Node versions required by your v16 bench
- App dependency: `erpnext`

## Install on an existing ERPNext 16 site

From your bench directory:

```bash
# Option A: from this repository (app lives in /instacertify_crm)
cd /path/to/frappe-bench
bench get-app /path/to/INSTACERTIFY-SALES-CRM/instacertify_crm
# or if this folder is published as its own git remote:
# bench get-app instacertify_crm https://github.com/instacertify/INSTACERTIFY-SALES-CRM --branch cursor/erpnext16-crm-b698

bench --site your-site.local install-app instacertify_crm
bench --site your-site.local migrate
bench build --app instacertify_crm
bench clear-cache
```

Assign users the roles:

| Role | Access |
|------|--------|
| `IC Admin` | All CRM data + export/Excel |
| `IC Sales Ops` | All CRM data, no export; no purchase price |

Open **Instacertify CRM** from the desk apps / workspace.

## Customer links

| Flow | URL |
|------|-----|
| Quote (accept / revise / print) | `https://your-site/q/<public_token>` |
| Document checklist upload | `https://your-site/d/<public_token>` |
| Report ready download | `https://your-site/r/<public_token>` |

On an **IC Quote**, use **Share / Reshare Quote** to mark it Shared and expose the public link. After **Accepted**, create **IC Document Request** and/or **IC Report**.

## Print format

Standard print format: **IC Quote Letterhead** (Jinja) on DocType `IC Quote`.

## Notes

- Seed data (lead sources, services/document library, default bank, sample testing rows) is created in `after_install` / `after_migrate`.
- This cloud agent environment cannot run a full ERPNext 16 bench (MariaDB/Redis + v16 Python/Node). Develop/test on your Instacertify ERPNext 16 server with the commands above.
- A prior Next.js prototype remains in the repo root for reference; **ERPNext 16 is the intended production framework**.

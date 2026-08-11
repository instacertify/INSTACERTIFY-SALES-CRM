# Instacertify CRM — ERPNext 16 custom app

Pure **ERPNext 16** Frappe app for Instacertify consulting + testing operations.

| App | Branch / note |
|-----|----------------|
| Frappe | `version-16` |
| ERPNext | `https://github.com/frappe/erpnext.git` @ `version-16` |
| Instacertify CRM | this folder |

## Install

See [root README](../README.md) or:

```bash
bench get-app /path/to/INSTACERTIFY-SALES-CRM/instacertify_crm
bench --site instacertify.local install-app instacertify_crm
bench --site instacertify.local migrate
bench build --app instacertify_crm
```

## Roles

Assign after install: `IC Admin`, `IC All Ops Manager`, `IC Operations Manager`, `IC Sales Person`.

- **IC Admin** — full access + export (Excel)
- **IC All Ops Manager** — view all, export, authorise ops
- **IC Operations Manager** — projects, hours, samples, customer records
- **IC Sales Person** — quotes/templates, assigned leads/customers

## Key DocTypes

| DocType | Purpose |
|---------|---------|
| IC Lead / IC Lead Source / IC Consultant | CRM intake |
| IC Quote / IC Quote Template | Quotations + reusable templates |
| IC Lab / IC Testing Service | Lab & test price library |
| IC Sample Request | Sample logistics + QR `/s/<token>` |
| IC Customer Project / Delivery / Incident | Delivery & customer file |
| IC Document Request | Checklist portal `/d/<token>` |
| IC Report | Report portal `/r/<token>` |
| IC Asset Register | Org assets with auto codes |
| IC Employee Profile / Salary Slip / Attendance / Holiday | HR lite |
| IC Settings | Branding / letterhead |

## Portals

`/q/` quote · `/d/` documents · `/r/` report · `/s/` sample · `/emp/` joining letter QR

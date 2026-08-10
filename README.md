# INSTACERTIFY-SALES-CRM

Instacertify sales & operations CRM.

## Production target: ERPNext 16

The installable Frappe app lives in [`instacertify_crm/`](./instacertify_crm/).

It is designed for an **existing ERPNext version-16** site (your sample EPR Plastic quote was already generated from Frappe print formats).

```bash
cd /path/to/frappe-bench
bench get-app ./path/to/INSTACERTIFY-SALES-CRM/instacertify_crm
bench --site <site> install-app instacertify_crm
bench --site <site> migrate
bench build --app instacertify_crm
```

See [`instacertify_crm/README.md`](./instacertify_crm/README.md) for roles, public quote/document/report links, and feature details.

### Roles
- **IC Admin** — full data + export
- **IC Sales Ops** — full data, no export; purchase price hidden

### Customer portals (on your ERPNext site)
- `/q/<token>` — quote accept / revise / print
- `/d/<token>` — document checklist upload
- `/r/<token>` — report ready download

## Optional: Next.js prototype

The repository root also contains an earlier **Next.js** prototype of the same flows for demos without a bench. Prefer the ERPNext 16 app for production on `instacertify.in`.

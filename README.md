# INSTACERTIFY-SALES-CRM

Instacertify sales & operations CRM built on **ERPNext 16**.

## Production: official ERPNext framework

This project installs as a Frappe custom app on top of:

```text
https://github.com/frappe/erpnext.git  (branch: version-16)
```

Verified locally with **Frappe 16.30.0** + **ERPNext 16.31.1**.

### Quick install

```bash
# From a machine with Python 3.14+, Node 24+, MariaDB, Redis
./scripts/setup_erpnext16_bench.sh
```

Or manually:

```bash
bench init --frappe-branch version-16 frappe-bench
cd frappe-bench
bench get-app erpnext --branch version-16 https://github.com/frappe/erpnext.git
bench new-site instacertify.local --admin-password 'Admin@123' --set-default
bench --site instacertify.local install-app erpnext

bench get-app /path/to/INSTACERTIFY-SALES-CRM/instacertify_crm
bench --site instacertify.local install-app instacertify_crm
bench --site instacertify.local migrate
bench serve --port 8000
```

App docs: [`instacertify_crm/README.md`](./instacertify_crm/README.md)

### Login
- Desk: `Administrator` / password you set at site creation
- Assign roles: `IC Admin` or `IC Sales Ops`

### Customer portals
- `/q/<token>` quote accept/revise/print  
- `/d/<token>` document uploads  
- `/r/<token>` report ready download  

## Optional Next.js prototype

The repo root still contains an earlier standalone Next.js prototype. Prefer the ERPNext app for production on `instacertify.in`.

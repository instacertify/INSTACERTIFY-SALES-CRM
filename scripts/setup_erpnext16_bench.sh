#!/usr/bin/env bash
# Bootstrap a local Frappe + ERPNext version-16 bench and install Instacertify CRM.
# Requires: Python 3.14+, Node 24+, MariaDB, Redis, yarn, frappe-bench
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BENCH_DIR="${BENCH_DIR:-$HOME/frappe-bench}"
SITE_NAME="${SITE_NAME:-instacertify.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-admin}"
PYTHON_BIN="${PYTHON_BIN:-python3.14}"

if ! command -v bench >/dev/null; then
  echo "Install frappe-bench first, e.g.:"
  echo "  uv venv --python 3.14 ~/bench-venv && source ~/bench-venv/bin/activate && uv pip install frappe-bench"
  exit 1
fi

if [[ ! -d "$BENCH_DIR" ]]; then
  bench init --frappe-branch version-16 --python "$PYTHON_BIN" --skip-redis-config-generation "$BENCH_DIR"
fi

cd "$BENCH_DIR"

if [[ ! -d apps/erpnext ]]; then
  # Official ERPNext framework source
  bench get-app erpnext --branch version-16 https://github.com/frappe/erpnext.git
fi

if [[ ! -e apps/instacertify_crm ]]; then
  ln -sfn "$REPO_ROOT/instacertify_crm" apps/instacertify_crm
  ./env/bin/pip install -e apps/instacertify_crm
fi

grep -qx frappe sites/apps.txt || echo frappe > sites/apps.txt
grep -qx erpnext sites/apps.txt || echo erpnext >> sites/apps.txt
grep -qx instacertify_crm sites/apps.txt || echo instacertify_crm >> sites/apps.txt

if [[ ! -d "sites/$SITE_NAME" ]]; then
  bench new-site "$SITE_NAME" \
    --mariadb-root-password "$DB_ROOT_PASSWORD" \
    --admin-password "$ADMIN_PASSWORD" \
    --set-default
fi

bench --site "$SITE_NAME" install-app erpnext || true
bench --site "$SITE_NAME" install-app instacertify_crm || true
bench --site "$SITE_NAME" migrate
bench build --app instacertify_crm

echo
echo "Ready."
echo "  Site:   $SITE_NAME"
echo "  Login:  Administrator / $ADMIN_PASSWORD"
echo "  Start:  cd $BENCH_DIR && bench serve --port 8000"
echo "  Assign roles: IC Admin | IC All Ops Manager | IC Operations Manager | IC Sales Person"
echo "  Then open the Instacertify CRM workspace (blue & orange desk)."

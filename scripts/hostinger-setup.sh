#!/usr/bin/env bash
# Simple Hostinger VPS setup — NO Docker.
# Run on Ubuntu 22.04/24.04 as a sudo-capable user.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/instacertify-crm}"
DOMAIN="${DOMAIN:-crm.instacertify.in}"
DB_NAME="${DB_NAME:-instacertify}"
DB_USER="${DB_USER:-instacertify}"
DB_PASS="${DB_PASS:-ChangeThisPassword}"

echo "==> Installing Node 22, PostgreSQL, Nginx, PM2 (no Docker)"
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates gnupg nginx postgresql postgresql-contrib

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo npm install -g pm2

echo "==> Ensuring PostgreSQL role + database"
sudo service postgresql start || true
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' SUPERUSER;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "==> App directory: ${APP_DIR}"
sudo mkdir -p "${APP_DIR}"
sudo chown -R "$USER:$USER" "${APP_DIR}"

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Copy or git clone the CRM repo into ${APP_DIR}, then re-run:"
  echo "  cd ${APP_DIR} && bash scripts/hostinger-deploy.sh"
  exit 0
fi

echo "==> Writing Nginx site for ${DOMAIN}"
sudo tee "/etc/nginx/sites-available/instacertify-crm" >/dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/instacertify-crm /etc/nginx/sites-enabled/instacertify-crm
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Server packages ready."
echo "Next:"
echo "  1) Put code in ${APP_DIR}"
echo "  2) Create ${APP_DIR}/.env (see .env.example)"
echo "  3) bash scripts/hostinger-deploy.sh"
echo "  4) Optional SSL: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d ${DOMAIN}"

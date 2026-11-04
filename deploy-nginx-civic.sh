#!/usr/bin/env bash
# Deploy nginx config for civicpress.ro

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_CONF="$ROOT_DIR/nginx.civic.probabilistik.dev.conf"
SITE_NAME="civicpress.ro"
DEST_CONF="/etc/nginx/sites-available/${SITE_NAME}"
ENABLED_LINK="/etc/nginx/sites-enabled/${SITE_NAME}"
CERT_FULLCHAIN="/etc/letsencrypt/live/${SITE_NAME}/fullchain.pem"
CERT_PRIVKEY="/etc/letsencrypt/live/${SITE_NAME}/privkey.pem"

cert_exists() {
  sudo test -f "$CERT_FULLCHAIN" && sudo test -f "$CERT_PRIVKEY"
}

if [ ! -f "$SRC_CONF" ]; then
  echo "Missing source config: $SRC_CONF"
  exit 1
fi

echo "Copying nginx config:"
echo "  $SRC_CONF"
echo "  -> $DEST_CONF"
if cert_exists; then
  sudo cp "$SRC_CONF" "$DEST_CONF"
else
  echo "TLS certificate not found yet for $SITE_NAME."
  echo "Deploying temporary HTTP-only nginx config so Certbot can issue certs."
  TMP_CONF="$(mktemp)"
  cat > "$TMP_CONF" <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name civicpress.ro www.civicpress.ro;

    client_max_body_size 110m;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    proxy_connect_timeout 10s;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }

    location /v1/ {
        proxy_pass http://127.0.0.1:3000/v1/;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:4300/admin/;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    location /api/_analog/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:4200;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
}
EOF
  sudo cp "$TMP_CONF" "$DEST_CONF"
  rm -f "$TMP_CONF"
fi

echo "Enabling site symlink:"
echo "  $ENABLED_LINK -> $DEST_CONF"
sudo ln -sfn "$DEST_CONF" "$ENABLED_LINK"

echo "Validating nginx configuration..."
sudo nginx -t

echo "Reloading nginx..."
sudo systemctl reload nginx

if ! cert_exists; then
  echo "HTTP-only config is active for $SITE_NAME."
  echo "Next step (issue certificate):"
  echo "  sudo certbot --nginx -d $SITE_NAME -d www.$SITE_NAME"
  echo "After certbot succeeds, run this script again:"
  echo "  $ROOT_DIR/deploy-nginx-civic.sh"
else
  echo "Done. Active site: $SITE_NAME"
fi

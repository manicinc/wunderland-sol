#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

log() { printf "\n[%s] %s\n" "$(date -Is)" "$*"; }

log "Installing base packages (ca-certificates, curl, git, nginx)..."
apt-get update -y
apt-get install -y --no-install-recommends ca-certificates curl git nginx

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

log "Installing pnpm and pm2 globally..."
npm i -g pnpm pm2

APP_DIR="/root/voice-chat-assistant"
REPO_URL="https://github.com/manicinc/voice-chat-assistant.git"

if [ ! -d "$APP_DIR" ]; then
  log "Cloning repository into $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
else
  log "Repository exists, pulling latest..."
  git -C "$APP_DIR" pull --rebase --autostash || true
fi

log "Installing workspace dependencies with pnpm..."
cd "$APP_DIR"
pnpm install

ENV_FILE="$APP_DIR/.env"
if ! grep -q "^PORT=" "$ENV_FILE" 2>/dev/null; then
  log "Creating minimal .env for production (edit later as needed)..."
  cat > "$ENV_FILE" <<'EOV'
PORT=3333
NODE_ENV=production
SERVE_FRONTEND=true
# IMPORTANT: change these to secure values
AUTH_JWT_SECRET=changeme
GLOBAL_ACCESS_PASSWORD=changeme
# Model routing defaults (safe fallbacks)
ROUTING_LLM_PROVIDER_ID=openai
ROUTING_LLM_MODEL_ID=gpt-4o-mini
EOV
fi

log "Building workspace (AgentOS, frontend, backend)..."
pnpm -w build || pnpm run build || true

log "Starting backend with PM2 on port 3333..."
pm2 delete voice-backend >/dev/null 2>&1 || true
pm2 start backend/dist/server.js --name voice-backend --node-args="--experimental-specifier-resolution=node"
pm2 save

log "Configuring Nginx: redirect vca.chat -> app.vca.chat, proxy app.vca.chat -> 127.0.0.1:3333..."
cat >/etc/nginx/sites-available/vca.conf <<'EON'
server { listen 80; server_name vca.chat www.vca.chat; return 301 http://app.vca.chat$request_uri; }
server {
  listen 80;
  server_name app.vca.chat;
  location / {
    proxy_pass http://127.0.0.1:3333;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EON

ln -sf /etc/nginx/sites-available/vca.conf /etc/nginx/sites-enabled/vca.conf
nginx -t && systemctl reload nginx || systemctl restart nginx || true

log "Health check (http://127.0.0.1:3333/health)..."
if ! curl -fsS http://127.0.0.1:3333/health; then
  echo "Health check failed (non-fatal in bootstrap)."
fi

log "PM2 status:"
pm2 status || true

log "Quick diagnostics:"
if command -v ss >/dev/null 2>&1; then
  ss -tulpn | grep -E '(:80|:3333)' || true
else
  netstat -tulpn | grep -E '(:80|:3333)' || true
fi
systemctl status nginx --no-pager -n 0 || true
tail -n 200 /var/log/nginx/error.log 2>/dev/null || true

log "Bootstrap finished."



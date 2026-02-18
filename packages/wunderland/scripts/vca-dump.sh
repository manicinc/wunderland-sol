#!/usr/bin/env bash

# Voice Chat Assistant - Production Diagnostics
# Collects Docker, PM2, Nginx, port, and basic system info.
# Safe to run multiple times; attempts to continue on individual command errors.

set -u

divider() {
  printf "\n============================================================\n%s\n============================================================\n\n" "$1"
}

run() {
  local title="$1"
  shift
  divider "$title"
  # shellcheck disable=SC2068
  "$@" 2>&1 || true
}

print_or() {
  local cmd_a="$1"
  local cmd_b="$2"
  if command -v "$cmd_a" >/dev/null 2>&1; then
    "$cmd_a" 2>/dev/null || true
  elif command -v "$cmd_b" >/dev/null 2>&1; then
    "$cmd_b" 2>/dev/null || true
  fi
}

echo
echo "VCA Diagnostics - $(date -Is)"
echo "Host: $(hostname) | Kernel: $(uname -a)"

divider "SYSTEM INFO"
echo "Uptime: $(uptime -p || true)"
echo
echo "IPv4 addresses:"
ip -4 addr show 2>/dev/null | awk '/inet /{print $2, "on", $NF}' || true
echo
echo "IPv6 addresses:"
ip -6 addr show 2>/dev/null | awk '/inet6/{print $2, "on", $NF}' || true
echo
if command -v ufw >/dev/null 2>&1; then
  echo "UFW status:"
  ufw status 2>/dev/null || true
fi

divider "DNS LOOKUPS (vca.chat / app.vca.chat)"
echo "getent hosts vca.chat:"
getent hosts vca.chat || true
echo
echo "getent hosts app.vca.chat:"
getent hosts app.vca.chat || true

divider "LISTENING PORTS (80, 443, 3001, 3333)"
if command -v ss >/dev/null 2>&1; then
  ss -tulpn 2>/dev/null | grep -E '(:80|:443|:3001|:3333)' || true
else
  netstat -tulpn 2>/dev/null | grep -E '(:80|:443|:3001|:3333)' || true
fi

divider "ENV HINTS"
if [ -f "$HOME/voice-chat-assistant/.env" ]; then
  echo "# $HOME/voice-chat-assistant/.env (first 50 lines)"
  sed -n '1,50p' "$HOME/voice-chat-assistant/.env" || true
else
  echo "No $HOME/voice-chat-assistant/.env found"
fi

divider "PM2 STATUS + LOGS"
if command -v pm2 >/dev/null 2>&1; then
  pm2 status || true
  echo
  echo "---- pm2 logs voice-backend (last 200) ----"
  pm2 logs voice-backend --lines 200 --nostream || true
  echo
  echo "---- pm2 logs (last 100) ----"
  pm2 logs --lines 100 --nostream || true
else
  echo "pm2 not installed"
fi

divider "DOCKER DAEMON STATUS"
print_or systemctl true 1>/dev/null # no-op to silence shellcheck
systemctl is-active docker 2>/dev/null || true
systemctl status docker --no-pager -n 0 2>/dev/null | sed -n '1,60p' || true
journalctl -u docker -n 150 --no-pager 2>/dev/null || true

divider "DOCKER CONTAINERS"
if command -v docker >/dev/null 2>&1; then
  docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' || true
  echo
  if docker compose ls >/dev/null 2>&1; then
    echo "---- docker compose ls ----"
    docker compose ls || true
    echo "---- docker compose ps ----"
    docker compose ps --all || true
  fi
  for name in $(docker ps -a --format '{{.Names}}'); do
    echo "===== DOCKER LOGS: $name (last 400) ====="
    docker logs --tail 400 --timestamps "$name" || true
    echo
  done
else
  echo "docker not installed"
fi

divider "NGINX STATUS + CONFIG + LOGS"
if command -v nginx >/dev/null 2>&1; then
  systemctl status nginx --no-pager -n 0 2>/dev/null | sed -n '1,60p' || true
  echo
  echo "---- nginx -t ----"
  nginx -t 2>&1 || true
  echo
  echo "---- nginx -T (first 200 lines) ----"
  nginx -T 2>&1 | sed -n '1,200p' || true
  echo
  echo "---- /var/log/nginx/error.log (last 200) ----"
  tail -n 200 /var/log/nginx/error.log 2>/dev/null || true
  echo
  echo "---- /var/log/nginx/access.log (last 100) ----"
  tail -n 100 /var/log/nginx/access.log 2>/dev/null || true
else
  echo "nginx not installed"
fi

divider "HEALTH CHECKS (localhost)"
for p in 3333 3001; do
  echo "GET http://127.0.0.1:$p/health"
  curl -fsS "http://127.0.0.1:$p/health" || echo "no response"
  echo
done

divider "REMOTE URL CHECKS (best-effort)"
echo "HEAD https://app.vca.chat"
curl -I -L -sS https://app.vca.chat || true
echo
echo "HEAD https://vca.chat"
curl -I -L -sS https://vca.chat || true
echo

divider "DONE"
echo "Finished at: $(date -Is)"



#!/bin/bash
set -e

# Quarry.space Linode Setup Script
# Run as root on fresh Ubuntu 24.04 Linode
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/setup-quarry-linode.sh | bash
#   OR
#   bash setup-quarry-linode.sh

DOMAIN="quarry.space"
REPO_URL="https://github.com/manicinc/voice-chat-assistant.git"  # Update this

echo "============================================"
echo "  Quarry.space Linode Server Setup"
echo "============================================"

echo "==> Updating system packages..."
apt update && apt upgrade -y

echo "==> Installing required packages..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw build-essential

echo "==> Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "==> Installing pnpm..."
npm install -g pnpm

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "==> Installing PostgreSQL 16..."
sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt update
apt install -y postgresql-16 postgresql-contrib-16

echo "==> Starting PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

echo "==> Installing Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

echo "==> Configuring Redis for production..."
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl restart redis-server

echo "==> Disabling password authentication (SSH key only)..."
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload sshd

echo "==> Setting up firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Creating directories..."
mkdir -p /var/www/quarry/landing
mkdir -p /opt/quarry
mkdir -p /opt/quarry/data
mkdir -p /opt/quarry/backups

echo "==> Cloning repository..."
cd /opt/quarry
if [ ! -d ".git" ]; then
  git clone $REPO_URL .
fi

echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Setup PostgreSQL database:"
echo "   sudo -u postgres createuser quarry -P"
echo "   sudo -u postgres createdb quarry_sync -O quarry"
echo "   sudo -u postgres psql -d quarry_sync -f /opt/quarry/apps/frame.dev/lib/api/db/syncTables.sql"
echo ""
echo "2. Generate JWT secret (save this!):"
echo "   openssl rand -base64 64"
echo ""
echo "3. Create environment file:"
echo "   cp /opt/quarry/apps/frame.dev/.env.production /opt/quarry/apps/frame.dev/.env.local"
echo "   nano /opt/quarry/apps/frame.dev/.env.local"
echo ""
echo "   Required environment variables:"
echo "   DATABASE_URL=postgresql://quarry:YOUR_PASSWORD@localhost:5432/quarry_sync"
echo "   JWT_SECRET=YOUR_64_CHAR_SECRET"
echo "   REDIS_URL=redis://localhost:6379"
echo "   STRIPE_SECRET_KEY=sk_live_xxx"
echo "   STRIPE_WEBHOOK_SECRET=whsec_xxx"
echo "   STRIPE_PRICE_MONTHLY=price_xxx"
echo "   STRIPE_PRICE_ANNUAL=price_xxx"
echo "   STRIPE_PRICE_LIFETIME=price_xxx"
echo "   RESEND_API_KEY=re_xxx"
echo "   FRONTEND_URL=https://quarry.space"
echo ""
echo "4. Build and deploy landing page:"
echo "   cd /opt/quarry/apps/frame.dev"
echo "   pnpm install"
echo "   STATIC_EXPORT=true pnpm build"
echo "   cp -r out/* /var/www/quarry/landing/"
echo ""
echo "5. Build and start the app:"
echo "   pnpm build"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "6. Configure nginx:"
echo "   cp /opt/quarry/deployment/nginx-quarry.conf /etc/nginx/sites-available/quarry.space"
echo "   ln -sf /etc/nginx/sites-available/quarry.space /etc/nginx/sites-enabled/"
echo "   rm -f /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "7. Get SSL certificates:"
echo "   certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "8. Test endpoints:"
echo "   curl https://quarry.space"
echo "   curl https://quarry.space/app"
echo "   curl https://quarry.space/api/v1/health"
echo "   curl https://quarry.space/api/v1/sync/status"
echo ""
echo "9. Setup backups (recommended):"
echo "   # Create backup script"
echo "   cat > /opt/quarry/backup.sh << 'BACKUP'"
echo "   #!/bin/bash"
echo "   BACKUP_DIR=/opt/quarry/backups"
echo "   DATE=\$(date +%Y%m%d_%H%M)"
echo "   pg_dump -U quarry quarry_sync | gzip > \$BACKUP_DIR/sync_\$DATE.sql.gz"
echo "   # Keep only last 7 days"
echo "   find \$BACKUP_DIR -name '*.sql.gz' -mtime +7 -delete"
echo "   BACKUP"
echo "   chmod +x /opt/quarry/backup.sh"
echo ""
echo "   # Add to crontab (daily at 3 AM)"
echo "   (crontab -l 2>/dev/null; echo '0 3 * * * /opt/quarry/backup.sh') | crontab -"
echo ""
echo "10. Register Stripe webhook:"
echo "    In Stripe Dashboard -> Developers -> Webhooks:"
echo "    Endpoint: https://quarry.space/api/v1/billing/webhook"
echo "    Events: checkout.session.completed, customer.subscription.*"
echo ""

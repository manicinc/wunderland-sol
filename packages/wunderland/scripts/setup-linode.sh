#!/bin/bash
set -e

# GitPayWidget Linode Setup Script
# Run as root on fresh Ubuntu 22.04 Linode

echo "==> Updating system packages..."
apt update && apt upgrade -y

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "==> Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

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

echo "==> Cloning gitpaywidget repository..."
mkdir -p /opt
cd /opt
if [ ! -d "gitpaywidget" ]; then
  git clone https://github.com/manicinc/gitpaywidget.git
fi
cd gitpaywidget

echo "==> Creating .env file (populate with your secrets)..."
cat > apps/gitpaywidget/.env <<EOF
NODE_ENV=production
FRONTEND_URL=https://gitpaywidget.com
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_API_KEY=your_lemon_key
KEY_ENCRYPTION_SECRET=$(openssl rand -hex 32)
EOF

echo "==> Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

echo "==> Done! Next steps:"
echo "  1. Edit /opt/gitpaywidget/apps/gitpaywidget/.env with real secrets"
echo "  2. Run: cd /opt/gitpaywidget && docker-compose -f docker-compose.prod.yml up -d"
echo "  3. Configure DNS: Point gitpaywidget.com A record to this server's IP"
echo "  4. Run: certbot --nginx -d gitpaywidget.com"


# Self-Hosting FABRIC

This guide covers everything you need to deploy FABRIC on your own infrastructure.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Bare Metal Installation](#bare-metal-installation)
8. [Reverse Proxy Configuration](#reverse-proxy-configuration)
9. [SSL/TLS Setup](#ssltls-setup)
10. [Connecting Clients](#connecting-clients)
11. [Backup & Recovery](#backup--recovery)
12. [Monitoring & Logging](#monitoring--logging)
13. [Performance Tuning](#performance-tuning)
14. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

FABRIC consists of several components:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Web Browser   │  Desktop App    │      Mobile App         │
│   (Next.js)     │  (Electron)     │   (Capacitor + Vue)     │
└────────┬────────┴────────┬────────┴──────────┬──────────────┘
         │                 │                    │
         ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Express)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Auth    │  │   LLM    │  │  Memory  │  │  Sync    │    │
│  │ Middleware│  │ Services │  │ Adapter  │  │ Endpoints│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌──────────────┐  ┌─────────────────────┐
│   PostgreSQL    │  │    Redis     │  │   LLM Providers     │
│   (Primary DB)  │  │ (Rate Limit) │  │ (OpenAI/Anthropic)  │
└─────────────────┘  └──────────────┘  └─────────────────────┘
```

### Component Details

| Component | Description | Required |
|-----------|-------------|----------|
| Backend API | Express.js server handling all business logic | Yes |
| PostgreSQL | Primary database for users, content, metadata | Yes |
| Redis | Rate limiting, caching, session storage | Recommended |
| LLM Provider | At least one AI provider for chat/embeddings | Yes |
| Frontend | Next.js web application | Optional (for web access) |

---

## Quick Start

### Prerequisites

- Node.js 20+ or Docker
- PostgreSQL 15+ (or SQLite for testing)
- Git

### Fastest Setup (Docker)

```bash
# Clone repository
git clone https://github.com/framersai/fabric.git
cd fabric

# Copy environment template
cp .env.example .env

# Edit .env with your configuration (see below)
nano .env

# Start services
docker compose up -d

# Verify
curl http://localhost:3001/health
```

---

## Environment Configuration

Create a `.env` file with the following variables:

### Required

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fabric

# At least one LLM provider
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# or
GOOGLE_AI_API_KEY=...

# Server
PORT=3001
NODE_ENV=production
```

### Recommended

```bash
# Redis for production rate limiting
REDIS_URL=redis://localhost:6379

# Frontend URL (for CORS)
FRONTEND_URL=https://your-domain.com

# JWT for authentication
JWT_SECRET=your-secure-random-string-at-least-32-chars

# Enable SQLite memory for conversation history
ENABLE_SQLITE_MEMORY=true
```

### Optional

```bash
# Additional CORS origins (comma-separated)
ADDITIONAL_CORS_ORIGINS=https://app.your-domain.com,http://localhost:3000

# Cost limits (disable for internal use)
DISABLE_COST_LIMITS=true

# TTS pre-warming
PREWARM_TTS=true

# S3-compatible storage
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

---

## Database Setup

### PostgreSQL (Recommended)

```bash
# Create database
createdb fabric

# Or with Docker
docker run -d \
  --name fabric-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=fabric \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine
```

Set `DATABASE_URL`:
```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/fabric
```

### SQLite (Development Only)

For quick testing, you can use SQLite:

```bash
ENABLE_SQLITE_MEMORY=true
# Database files will be created in ./db_data/
```

> **Warning:** SQLite is not recommended for production. Use PostgreSQL for multi-user deployments.

---

## Docker Deployment

### Development

```bash
docker compose up -d
```

### Production with Full Stack

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  fabric:
    image: ghcr.io/framersai/fabric:latest
    container_name: fabric-api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/fabric
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: ghcr.io/framersai/fabric-frontend:latest
    container_name: fabric-web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://fabric:3001
    depends_on:
      - fabric
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    container_name: fabric-db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=fabric
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: fabric-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

Run with:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Kubernetes Deployment

### Using Helm

```bash
# Add repository
helm repo add fabric https://charts.frame.dev
helm repo update

# Create namespace
kubectl create namespace fabric

# Create secrets
kubectl create secret generic fabric-secrets \
  --namespace fabric \
  --from-literal=openai-api-key=sk-... \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=postgres-password=your-db-password

# Install
helm install fabric fabric/fabric \
  --namespace fabric \
  --set postgresql.enabled=true \
  --set redis.enabled=true \
  --set ingress.enabled=true \
  --set ingress.hostname=fabric.your-domain.com \
  --set ingress.tls.enabled=true
```

### Custom Values

Create `values.yaml`:

```yaml
replicaCount: 2

image:
  repository: ghcr.io/framersai/fabric
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3001

ingress:
  enabled: true
  className: nginx
  hostname: fabric.your-domain.com
  tls:
    enabled: true
    secretName: fabric-tls

postgresql:
  enabled: true
  auth:
    existingSecret: fabric-secrets
    secretKeys:
      adminPasswordKey: postgres-password
  primary:
    persistence:
      size: 20Gi

redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: false

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

Apply:
```bash
helm install fabric fabric/fabric -f values.yaml --namespace fabric
```

---

## Bare Metal Installation

### 1. Install Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx

# Verify Node.js version (need 20+)
node --version

# Install pnpm
npm install -g pnpm
```

### 2. Clone and Build

```bash
git clone https://github.com/framersai/fabric.git
cd fabric

# Install dependencies
pnpm install

# Build backend
pnpm --filter backend build

# Build frontend (optional)
pnpm --filter frontend build
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
# Configure as described above
```

### 4. Setup Database

```bash
sudo -u postgres createdb fabric
sudo -u postgres psql -c "CREATE USER fabric WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fabric TO fabric;"
```

### 5. Run as Service

Create `/etc/systemd/system/fabric.service`:

```ini
[Unit]
Description=FABRIC Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/fabric
ExecStart=/usr/bin/node backend/dist/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fabric
sudo systemctl start fabric
```

---

## Reverse Proxy Configuration

### Nginx

Create `/etc/nginx/sites-available/fabric`:

```nginx
upstream fabric_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name fabric.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fabric.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/fabric.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fabric.your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://fabric_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Large file uploads
    client_max_body_size 50M;
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/fabric /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d fabric.your-domain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

---

## Connecting Clients

### Desktop App (Electron)

1. Download from releases page or build from source
2. Open Settings → Backend
3. Enter: `https://fabric.your-domain.com`
4. (Optional) Enter API key if using authentication

### Mobile App (iOS/Android)

1. Install from App Store / Play Store
2. Open Settings → Backend Sync
3. Enter backend URL: `https://fabric.your-domain.com`
4. (Optional) Enter API key
5. Tap "Test Connection"
6. Enable auto-sync if desired

### Web Access

Navigate to `https://fabric.your-domain.com` in your browser.

---

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump -U fabric -h localhost fabric > backup_$(date +%Y%m%d).sql

# Automated daily backup (crontab)
0 2 * * * pg_dump -U fabric fabric | gzip > /backups/fabric_$(date +\%Y\%m\%d).sql.gz
```

### Restore

```bash
psql -U fabric -h localhost fabric < backup.sql
```

### Redis Backup

Redis with AOF enabled auto-persists. For manual backup:
```bash
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backups/redis_$(date +%Y%m%d).rdb
```

---

## Monitoring & Logging

### Health Check Endpoint

```bash
curl https://fabric.your-domain.com/health
```

Response:
```json
{
  "status": "UP",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "llm": {
    "ready": true,
    "code": "LLM_READY",
    "providers": {
      "openai": "available",
      "anthropic": "available"
    }
  }
}
```

### Prometheus Metrics

Add to your Prometheus config:
```yaml
scrape_configs:
  - job_name: 'fabric'
    static_configs:
      - targets: ['fabric.your-domain.com:3001']
    metrics_path: /api/metrics
```

### Logging

Logs are output to stdout. For production, configure log aggregation:

```bash
# Docker
docker logs -f fabric-api 2>&1 | tee /var/log/fabric/api.log

# Systemd
journalctl -u fabric -f
```

---

## Performance Tuning

### Node.js

```bash
# Increase memory limit for large datasets
NODE_OPTIONS="--max-old-space-size=4096"

# Enable clustering (handled by PM2 or container orchestrator)
```

### PostgreSQL

Tune `postgresql.conf`:
```ini
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.7
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 6553kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Redis

Tune `redis.conf`:
```ini
maxmemory 512mb
maxmemory-policy allkeys-lru
```

---

## Troubleshooting

### Common Issues

#### "No LLM provider configured"

Ensure at least one API key is set:
```bash
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

#### Database connection errors

Check DATABASE_URL format:
```
postgresql://user:password@host:port/database
```

Verify PostgreSQL is running and accessible.

#### Rate limiting issues

Ensure Redis is connected. Check REDIS_URL is set correctly.

#### CORS errors

Add your frontend domain to:
```bash
FRONTEND_URL=https://your-frontend.com
# or
ADDITIONAL_CORS_ORIGINS=https://app1.com,https://app2.com
```

### Getting Help

- [GitHub Issues](https://github.com/framersai/fabric/issues)
- [Community Discussions](https://github.com/framersai/fabric/discussions)
- [Discord Server](https://discord.gg/fabric)

---

## Updates

To update your self-hosted instance:

### Docker
```bash
docker compose pull
docker compose up -d
```

### Bare Metal
```bash
cd /opt/fabric
git pull
pnpm install
pnpm --filter backend build
sudo systemctl restart fabric
```

### Kubernetes
```bash
helm repo update
helm upgrade fabric fabric/fabric --namespace fabric
```

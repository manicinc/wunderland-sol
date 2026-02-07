---
sidebar_position: 2
---

# Cloud Hosting

Deploy the Wunderland stack to managed cloud platforms. This guide covers Linode (primary), Vercel, and Railway, plus CI/CD with GitHub Actions.

## Linode Deployment

Linode is the primary hosting platform for Wunderland production deployments. A single **Linode 4GB** instance ($24/mo) can run the full stack (backend + frontend + SQLite).

### Initial Server Setup

```bash
# SSH into your Linode
ssh root@your-linode-ip

# Create a non-root user
adduser wunderland
usermod -aG sudo wunderland

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
corepack enable
corepack prepare pnpm@9 --activate

# Install Nginx
sudo apt install -y nginx

# Install additional dependencies
sudo apt install -y git build-essential
```

### Deploy the Application

```bash
# Switch to the wunderland user
su - wunderland

# Clone and build
git clone https://github.com/manicinc/voice-chat-assistant.git /opt/wunderland
cd /opt/wunderland
pnpm install

# Configure environment files
cp backend/.env.example backend/.env
cp apps/rabbithole/.env.example apps/rabbithole/.env

# Edit both .env files with production values
# See the Environment Variables reference for all options
nano backend/.env
nano apps/rabbithole/.env

# Build everything
cd backend && pnpm build && cd ..
cd apps/rabbithole && pnpm build && cd ..
```

### Linode Environment Variables

Set these in `backend/.env`:

```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=<openssl rand -base64 32>
FRONTEND_URL=https://your-domain.com
WUNDERLAND_ENABLED=true

# SQLite is fine for single-server deployments
# Or use Linode Managed Database for PostgreSQL:
# DATABASE_URL=postgresql://user:pass@lin-xxxxx-mysql-primary.servers.linodedb.net:5432/wunderland
```

Set these in `apps/rabbithole/.env`:

```bash
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

### Set Up Services and Nginx

Follow the [systemd service files](/docs/deployment/self-hosting#running-with-systemd) and [Nginx reverse proxy](/docs/deployment/self-hosting#nginx-reverse-proxy) sections from the Self-Hosting guide. For Linode, the Nginx config is identical.

### Linode Firewall (Cloud Firewall)

In addition to the server-level UFW, configure the Linode Cloud Firewall via the dashboard:

| Direction | Protocol | Ports | Source |
|-----------|----------|-------|--------|
| Inbound | TCP | 22 | Your IP only |
| Inbound | TCP | 80, 443 | 0.0.0.0/0, ::/0 |
| Inbound | TCP | All | Drop |
| Outbound | TCP/UDP | All | 0.0.0.0/0, ::/0 |

---

## Vercel Deployment (Frontend Only)

Vercel is well-suited for deploying the Next.js frontend apps. The backend must still run on a separate server (Linode, Railway, etc.).

### Deploy Rabbithole to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the monorepo root
cd /path/to/voice-chat-assistant
vercel --cwd apps/rabbithole
```

Or connect your GitHub repository in the Vercel dashboard:

1. Import the repository at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `apps/rabbithole`
3. Set **Framework Preset** to `Next.js`
4. Set **Build Command** to `pnpm build`
5. Set **Install Command** to `pnpm install`

### Vercel Environment Variables

Set these in **Vercel Dashboard > Project Settings > Environment Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.your-domain.com/api` |
| `AUTH_SECRET` | `<random 32-byte base64 string>` |
| `AUTH_TRUST_HOST` | `true` |
| `STRIPE_SECRET_KEY` | `sk_live_...` (if billing enabled) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `RESEND_API_KEY` | `re_...` (if email enabled) |
| `INTERNAL_API_SECRET` | Must match backend `INTERNAL_API_SECRET` |
| `NEXT_PUBLIC_WUNDERLAND_ENABLE_CHAIN_PROOFS` | `false` (or `true` for Solana deployments) |

### Deploy Wunderland Sol Frontend to Vercel

```bash
vercel --cwd apps/wunderland-sh/app
```

Vercel environment variables for the Sol app:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_PROGRAM_ID` | `ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88` |
| `NEXT_PUBLIC_CLUSTER` | `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC` | Your RPC provider URL (optional) |
| `WUNDERLAND_ENCLAVE_NAMES` | `wunderland,governance,proof-theory,...` |

:::caution
Do **not** put API-keyed Solana RPC URLs in `NEXT_PUBLIC_` variables. These are embedded in the client bundle. Use a public RPC or a proxy endpoint.
:::

---

## Railway Deployment

Railway is a good option for the backend when you want managed infrastructure without configuring a server.

### Deploy Backend to Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set **Root Directory** to `backend`
4. Add a **PostgreSQL** service from the Railway marketplace
5. Railway will automatically set `DATABASE_URL`

### railway.toml

Create `backend/railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install && pnpm build"

[deploy]
startCommand = "node --experimental-specifier-resolution=node dist/src/main.js"
healthcheckPath = "/api/wunderland/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Railway Environment Variables

Set these in **Railway Dashboard > Variables**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `${{PORT}}` (Railway injects this) |
| `JWT_SECRET` | `<random 32-byte base64 string>` |
| `FRONTEND_URL` | `https://your-vercel-app.vercel.app` |
| `WUNDERLAND_ENABLED` | `true` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (auto-linked) |

Railway provides a public URL like `https://your-app.up.railway.app`. Point `NEXT_PUBLIC_API_URL` in your Vercel frontend to this URL.

---

## CI/CD with GitHub Actions

### Build and Deploy Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Wunderland

on:
  push:
    branches: [master]
  workflow_dispatch:

env:
  NODE_VERSION: "20"

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build backend
        run: cd backend && pnpm build

      - name: Run backend tests
        run: cd backend && pnpm test
        env:
          NODE_ENV: test
          JWT_SECRET: test-secret

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Linode via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            cd /opt/wunderland
            git pull origin master
            pnpm install --frozen-lockfile
            cd backend && pnpm build
            sudo systemctl restart wunderland-backend

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Deploy Rabbithole to Vercel
        run: |
          npm i -g vercel
          vercel --cwd apps/rabbithole --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `LINODE_HOST` | IP address of your Linode server |
| `LINODE_USER` | SSH username (e.g., `wunderland`) |
| `LINODE_SSH_KEY` | Private SSH key for deployment |
| `VERCEL_TOKEN` | Vercel API token from [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Found in `.vercel/project.json` after first deploy |
| `VERCEL_PROJECT_ID` | Found in `.vercel/project.json` after first deploy |

### Deployment Checklist

Before deploying to production, verify:

- [ ] All environment variables are set on the target platform
- [ ] `JWT_SECRET` and `AUTH_SECRET` are unique, random 32+ byte strings
- [ ] `FRONTEND_URL` and `CORS` settings match your actual domain
- [ ] `NODE_ENV=production` is set
- [ ] Database backups are configured
- [ ] SSL certificates are valid and auto-renewing
- [ ] Health check endpoint responds at `/api/wunderland/health`
- [ ] Firewall allows only ports 22, 80, and 443

---

## Docs Site Deployment

The documentation site (Docusaurus) can be deployed to any static host:

```bash
cd apps/wunderland-sh/docs-site
pnpm install
pnpm build

# The build/ directory contains static HTML/CSS/JS
# Deploy to Vercel, Netlify, GitHub Pages, or any CDN
```

For Vercel:

```bash
vercel --cwd apps/wunderland-sh/docs-site
```

For GitHub Pages, add to your workflow:

```yaml
  deploy-docs:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: cd apps/wunderland-sh/docs-site && pnpm build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: apps/wunderland-sh/docs-site/build
```

## Next Steps

- [Self-Hosting](/docs/deployment/self-hosting) -- run on your own hardware with systemd or Docker
- [Environment Variables](/docs/deployment/environment-variables) -- full configuration reference
- [Architecture Overview](/docs/architecture/overview) -- understand the system layers

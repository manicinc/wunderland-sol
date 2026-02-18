# Production Setup Guide

## Quick Start

```bash
# 1. Build the frontend
cd frontend && npm run build && cd ..

# 2. Enable frontend serving in .env
# Set SERVE_FRONTEND=true in your .env file

# 3. Start the production server
npm run start

# 4. Access the application
# Open http://localhost:3001 (NOT 3000!)
```

## Understanding the Ports

### Development Mode (`npm run dev`)

- Frontend: http://localhost:3000 (Vite dev server)
- Backend API: http://localhost:3001 (Express server)
- Two separate processes running

### Production Mode (`npm run start`)

- Everything: http://localhost:3001
- Backend serves both API and static frontend files
- Single process, optimized for deployment

## Step-by-Step Production Setup

### 1. Install Dependencies

```bash
npm run install-all
```

### 2. Configure Environment

Edit `.env` file:

```env
# Required for production
SERVE_FRONTEND=true
PORT=3001
NODE_ENV=production

# Your API keys
OPENAI_API_KEY=your_key_here
# ... other keys
```

### 3. Build Frontend

```bash
cd frontend
npm run build
# This creates frontend/dist with static files
cd ..
```

### 4. Start Production Server

```bash
npm run start
```

### 5. Access Application

Open browser to: **http://localhost:3001**

## CI/CD via GitHub Actions

This repo includes an optional VPS deploy workflow:

- `.github/workflows/deploy-wunderland-node.yml`

It SSHes into your VPS and restarts the Docker Compose stack in `deployment/wunderland-node/`.

Setup instructions + required secrets live in:

- `deployment/wunderland-node/GITHUB_ACTIONS_DEPLOY.md`

## Troubleshooting

### "localhost:3000 refused to connect"

- In production, the app runs on port 3001, not 3000
- Use http://localhost:3001

### Frontend not loading

- Ensure `SERVE_FRONTEND=true` in .env
- Check that `frontend/dist` exists (run build first)
- Verify `frontend/dist/index.html` exists

### API not working

- Check your API keys in .env
  - Ensure backend is running (check console output)
- Verify PORT=3001 in .env

- Hit `curl http://localhost:3001/api/system/llm-status` (or the deployed URL) to confirm an LLM provider is configured. A 200 response means the assistant can start; a 503 response includes details about missing API keys.
- When deploying via GitHub Actions, make sure the `ENV` secret includes an `AUTH_JWT_SECRET=` line with a real value and no surrounding quotes; the backend will crash on boot if it’s missing.
- For the live signup funnel, ensure Lemon Squeezy product and variant IDs are present before flipping the feature flag. See [`docs/SIGNUP_BILLING_IMPLEMENTATION_PLAN.md`](docs/SIGNUP_BILLING_IMPLEMENTATION_PLAN.md) for the full onboarding and billing workflow.

## Docker Deployment

For containerized deployment:

```bash
docker-compose up -d
```

## Process Management (PM2)

For production servers:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start backend/dist/server.js --name voice-chat

# Save PM2 config
pm2 save
pm2 startup
```

## Nginx Reverse Proxy

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables Reference

Key production variables:

- `SERVE_FRONTEND=true` - Enable static file serving
- `PORT=3001` - Server port
- `NODE_ENV=production` - Production mode
- `FRONTEND_URL` - Not needed when SERVE_FRONTEND=true

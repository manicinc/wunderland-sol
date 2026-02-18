# GitHub Actions Deploy (Wunderland Node)

This repo includes an optional deploy workflow that can SSH into your VPS and restart the Wunderland stack (backend + IPFS) via Docker Compose.

## 1) Server Prereqs

- Docker + Docker Compose plugin installed
- This repo checked out on the server (or you clone it once manually)
- Repo-root `.env` present on the server (gitignored) with production values

## 2) GitHub Actions Secrets

Create these GitHub repo secrets:

- `WUNDERLAND_SSH_HOST` (VPS IP / hostname)
- `WUNDERLAND_SSH_USER` (e.g. `root` or `deploy`)
- `WUNDERLAND_SSH_PRIVATE_KEY` (an SSH key that can log into the VPS)
- `WUNDERLAND_REMOTE_DIR` (absolute path to the repo on the VPS, e.g. `/home/deploy/voice-chat-assistant`)

Optional:

- `WUNDERLAND_SSH_PORT` (defaults to `22`)

## 3) What The Workflow Does

On push to `main`/`master` (or manual dispatch), it:

1. SSHes into the VPS
2. `git pull --ff-only` in `WUNDERLAND_REMOTE_DIR`
3. Runs:
   - `docker compose -f deployment/wunderland-node/docker-compose.yml up -d --build`

Notes:

- This builds images on the VPS. If you want CI-built images pushed to a registry (GHCR) and only `pull` on the VPS, we can add that next.
- Make sure the repo on the VPS has Git credentials set up (deploy key / SSH agent) if it’s private.

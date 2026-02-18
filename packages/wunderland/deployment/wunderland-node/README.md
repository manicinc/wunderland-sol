# Wunderland Node (Backend + IPFS) via Docker Compose

This runs:

- IPFS Kubo (raw-block storage for hash-addressed content)
- The monorepo backend (Wunderland module + tip snapshot pinning)

## Prereqs (VPS)

- Docker + Docker Compose plugin installed
- Enough disk for IPFS data (attach a volume if needed)

## Setup

1. Create repo-root `.env` (gitignored) and include:

```env
WUNDERLAND_ENABLED=true
PORT=3001

# Kubo API URL is overridden to the internal Docker address in docker-compose.yml.
# WUNDERLAND_IPFS_API_URL=http://127.0.0.1:5001

# Public gateway for client links/fallback reads (or point to your own gateway).
WUNDERLAND_IPFS_GATEWAY_URL=https://ipfs.io
```

2. Start the stack:

```bash
cd deployment/wunderland-node
docker compose up -d --build
```

3. Verify:

- Backend: `curl http://localhost:3001/health`
- IPFS gateway (optional): `curl http://127.0.0.1:8080/api/v0/version` (gateway is bound to localhost)

## Notes

- The IPFS API port (5001) is not exposed to the host; the backend talks to it over the Docker network.
- Persistent data lives in Docker volumes: `ipfs_data` and `backend_db`.
- For additional hardening, put the backend behind nginx/Caddy and restrict origin/CORS settings.

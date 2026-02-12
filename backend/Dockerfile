# syntax=docker/dockerfile:1

# Wunderland Sol — NestJS backend, standalone repo build.
# Build context is the wunderland-sh repo root.

FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

# Copy the full workspace (filtered by .dockerignore).
COPY . .

RUN pnpm install --no-frozen-lockfile --shamefully-hoist

# Clean stale dist artifacts from any prior build / submodule state.
RUN rm -rf packages/agentos/dist packages/agentos-extensions-registry/dist

# Build packages in dependency order:
#   shared -> sql-storage-adapter -> agentos -> extensions-registry
#   -> curated extensions -> wunderland -> sdk -> backend
RUN pnpm --filter @framers/shared build \
 && pnpm --filter @framers/sql-storage-adapter build \
 && pnpm --filter @framers/agentos build \
 && pnpm --filter @framers/agentos-extensions-registry build \
 && pnpm --filter @framers/agentos-ext-cli-executor build \
 && pnpm --filter @framers/agentos-ext-web-search build \
 && pnpm --filter @framers/agentos-ext-web-browser build \
 && pnpm --filter @framers/agentos-ext-giphy build \
 && pnpm --filter @framers/agentos-ext-image-search build \
 && pnpm --filter @framers/agentos-ext-voice-synthesis build \
 && pnpm --filter @framers/agentos-ext-news-search build \
 && pnpm --filter wunderland build \
 && pnpm --filter @wunderland-sol/sdk build \
 && pnpm --filter @wunderland-sol/backend build

# Prune devDependencies from node_modules to reduce image size.
RUN pnpm prune --prod --no-optional 2>/dev/null || true

# -----------------------------------------------------------------------------

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Copy built artifacts and pruned node_modules directly.
# This avoids `pnpm deploy` which fails resolving unpublished workspace packages.
COPY --from=builder /repo/backend/dist ./dist
COPY --from=builder /repo/backend/package.json ./package.json
COPY --from=builder /repo/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/src/main.js"]

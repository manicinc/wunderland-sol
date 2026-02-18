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
 && pnpm --filter @framers/agentos-skills-registry build \
 && pnpm --filter wunderland build \
 && pnpm --filter @wunderland-sol/sdk build \
 && pnpm --filter @wunderland-sol/backend build

# Prune devDependencies (keep optionals — extensions are optionalDeps).
RUN pnpm prune --prod 2>/dev/null || true

# Force ALL workspace packages to use their built workspace versions.
# pnpm may hoist npm-published versions over workspace builds when
# extensions depend on ^semver ranges. Overwrite with actual builds.
RUN for pkg in \
      "packages/agentos:@framers/agentos" \
      "packages/shared:@framers/shared" \
      "packages/sql-storage-adapter:@framers/sql-storage-adapter" \
      "packages/agentos-extensions-registry:@framers/agentos-extensions-registry" \
      "packages/agentos-skills-registry:@framers/agentos-skills-registry" \
      "packages/agentos-ext-skills:@framers/agentos-ext-skills" \
      "packages/agentos-extensions/registry/curated/system/cli-executor:@framers/agentos-ext-cli-executor" \
      "packages/agentos-extensions/registry/curated/research/web-search:@framers/agentos-ext-web-search" \
      "packages/agentos-extensions/registry/curated/research/web-browser:@framers/agentos-ext-web-browser" \
      "packages/agentos-extensions/registry/curated/research/news-search:@framers/agentos-ext-news-search" \
      "packages/agentos-extensions/registry/curated/media/giphy:@framers/agentos-ext-giphy" \
      "packages/agentos-extensions/registry/curated/media/image-search:@framers/agentos-ext-image-search" \
      "packages/agentos-extensions/registry/curated/media/voice-synthesis:@framers/agentos-ext-voice-synthesis" \
      "packages/wunderland:wunderland" \
      "sdk:@wunderland-sol/sdk"; \
    do \
      src="${pkg%%:*}"; \
      dest="node_modules/${pkg##*:}"; \
      if [ -d "$src" ]; then \
        rm -rf "$dest" && mkdir -p "$dest" \
        && cp "$src/package.json" "$dest/package.json" 2>/dev/null || true \
        && cp -r "$src/dist" "$dest/dist" 2>/dev/null || true; \
      fi; \
    done \
 && echo '[docker] Workspace packages installed into node_modules.'

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

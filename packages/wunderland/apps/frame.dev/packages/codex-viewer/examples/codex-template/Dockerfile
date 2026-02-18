FROM node:20-alpine

RUN corepack enable

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY next.config.mjs ./
COPY app ./app
COPY components ./components
COPY weaves ./weaves
COPY codex.config.json ./codex.config.json
COPY public ./public

RUN pnpm install --prefer-offline
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start", "--", "-p", "3000"]


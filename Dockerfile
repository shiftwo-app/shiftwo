# syntax=docker/dockerfile:1
# セルフホスト用のイメージ（Node + Postgres）。使い方は deploy/docker/compose.yml と README の「セルフホスト」
#
#   build   … 依存を入れて build する。マイグレーション（prisma migrate deploy）もこの段階のイメージで流す
#   runtime … build したものと、本番の依存だけを入れた、動かすためのイメージ

FROM node:26-slim AS base
RUN npm install -g pnpm@12.15.0
WORKDIR /app

FROM base AS build
COPY . .
# postinstall で Prisma Client（src/generated）も作る
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Prisma Client は build に含まれているので、作り直さない（--ignore-scripts）
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:26-slim AS runtime
ENV NODE_ENV=production \
	PORT=3000 \
	STORAGE_DIR=/data/uploads
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# アップロードしたファイルの置き場所。volume をここにつなぐ
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node_modules/.bin/srvx", "--prod", "-s", "../client", "dist/server/server.js"]

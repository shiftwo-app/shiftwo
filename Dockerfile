# syntax=docker/dockerfile:1
# セルフホスト用のイメージ（Node + Postgres）。使い方は deploy/docker/compose.yml と README の「セルフホスト」
#
#   build   … 依存を入れて build する。マイグレーション（prisma migrate deploy）もこの段階のイメージで流す
#   runtime … build したものだけを入れた、動かすためのイメージ。
#             サーバーの依存は build のときに dist/server へまとめる（BUNDLE_SERVER=1）ので、node_modules を持たない。
#             入れるのは、サーバーを動かす srvx（依存なし）だけ

FROM node:26-slim AS build
RUN npm install -g pnpm@12.15.0
WORKDIR /app
COPY . .
# postinstall で Prisma Client（src/generated）も作る
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile
RUN BUNDLE_SERVER=1 pnpm build
# pnpm の node_modules はリンクなので、srvx の中身を実体のまま取り出しておく
RUN cp -rL node_modules/srvx /srvx

# Prisma 7 の Client は WebAssembly で動き、pg も JavaScript だけなので、ネイティブのバイナリは要らない（alpine で動く）
FROM node:26-alpine AS runtime
ENV NODE_ENV=production \
	PORT=3000 \
	STORAGE_DIR=/data/uploads
WORKDIR /app
COPY --from=build /srvx ./node_modules/srvx
COPY --from=build /app/dist ./dist
COPY package.json ./
# アップロードしたファイルの置き場所。volume をここにつなぐ
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "node_modules/srvx/bin/srvx.mjs", "--prod", "-s", "../client", "dist/server/server.js"]

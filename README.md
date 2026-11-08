<div align="center">
<img src="https://raw.githubusercontent.com/shiftwo-app/shiftwo/main/.github/logo_standard.svg" alt="Shiftwo / シフトヲ" style="width: 400px; max-width: 100%;" />
</div>

技術カンファレンスの運営スタッフ向けのシフト管理アプリです。

## 技術スタック

- [TanStack Start](https://tanstack.com/start)（React 19・TanStack Router）
- [Vite+](https://viteplus.dev/)（`vp`。Vite・Oxlint・Oxfmt・Vitest をまとめたツールチェーン）
- [Prisma](https://www.prisma.io/) + PostgreSQL
- Tailwind CSS v4
- Node.js 26 系 LTS・pnpm 12

## はじめかた

### 1. 環境変数

`env.example` を `.env` にコピーし、DB の接続先を書き換えます（`env.example` は devcontainer 用の値です）。

```bash
cp env.example .env
```

`.env` には、少なくとも `DATABASE_URL` と `BETTER_AUTH_SECRET`（`openssl rand -base64 32` などで作る）を入れてください。

### 2. DB と依存の準備

devcontainer を使う場合は、VS Code で「Reopen in Container」を選ぶと DB も一緒に起動し、`pnpm install` まで実行されます。

手元で動かす場合:

```bash
cd .devcontainer && docker compose up -d db && cd ..
pnpm install          # postinstall で prisma generate も走る
pnpm exec prisma migrate dev
pnpm prisma:seed
```

### 3. 開発サーバー

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開くと確定シフト、[/draft](http://localhost:3000/draft) を開くと下書きのシフトが表示されます。

## よく使うコマンド

| コマンド                         | 内容                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                       | 開発サーバーを起動する（`vp dev`）                                             |
| `pnpm build`                     | 本番用に build する（`vp build`。出力は `dist/`）                              |
| `pnpm start`                     | build したものを Node.js で動かす（srvx）                                      |
| `pnpm check`                     | 書式・lint・型チェックをまとめて行う（`vp check`）                             |
| `pnpm check:fix`                 | 書式を直し、lint の自動修正をかける                                            |
| `pnpm test`                      | テストを動かす（`vp test`）                                                    |
| `pnpm prisma:migrate new <名前>` | Postgres と SQLite の両方にマイグレーションを作る                              |
| `pnpm prisma:migrate check`      | 両方のマイグレーションがモデルと合っているかを見る                             |
| `pnpm prisma:seed`               | 初期データを入れる（`prisma db seed`。Node 26 で `prisma/seed.ts` を直接実行） |

書式と lint の設定は `vite.config.ts` の `fmt`・`lint` にあります。

### ログインと新規登録

ログインは [Better Auth](https://www.better-auth.com/) で、次の 2 つの方法があります。

- **メール**：確認コードと、押すだけでログインできるリンクを 1 通のメールで送ります（10 分で使えなくなります）。開発中（`MAIL_TRANSPORT` が未設定）はメールを送らず、dev サーバーのターミナルに出します
- **Discord**：`DISCORD_CLIENT_ID` と `DISCORD_CLIENT_SECRET` の両方を設定したときだけ、ログイン画面にボタンが出ます。[Discord Developer Portal](https://discord.com/developers/applications) でアプリを作り、OAuth2 の Redirects に `<BETTER_AUTH_URL>/api/auth/callback/discord` を登録してください

はじめての人は、どちらの方法でもアカウントが作られ、`/welcome` で名前を決めてから使い始めます（新規登録は `/signup`）。

画面、server function、API（`/api/*`）は、どれもログインが必要です。

### 団体（複数の団体が同じインスタンスを使う）

- 団体の画面は `/o/<団体の URL 名>`（確定シフト・下書き・設定とメンバー）。ログイン後のトップ（`/`）に、所属している団体の一覧が出ます
- 団体は `/orgs/new` で作れます（作った人がオーナー）。ほかの人は **招待コード**（`/join`）で参加します
- 招待コードは 8 文字（読み間違えやすい 0・O・1・I・L は使わない）。発行するときに、参加したときの役割・使える回数（既定は 1 回）・有効期限（既定は 7 日）を決めます。発行と取り消しはリーダー以上
- 表示名は団体ごとに決められます（設定とメンバーの画面）
- 役割とできること

  |                                          | オーナー | リーダー | スタッフ | ゲスト |
  | ---------------------------------------- | -------- | -------- | -------- | ------ |
  | シフトを見る・メンバーを見る             | ○        | ○        | ○        | ○      |
  | シフトを作る・変える・確定する           | ○        | ○        |          |        |
  | 招待コードを発行・取り消す               | ○        | ○        |          |        |
  | メンバーの役割を変える・外す、団体の設定 | ○        |          |          |        |

- **所属していない団体のデータは見えません。** 団体のデータを読み書きする処理は、必ず `requireOrgAccess`（`src/server/org-access.server.ts`）でメンバーかと権限を確かめ、団体の ID で絞り込みます。所属していない団体は「見つかりません」（404）として扱い、団体があるかどうかも漏らしません。これは `src/server/org-isolation.integration.test.ts` で、実際の DB を使って確かめています（`DATABASE_URL` がないと飛ばします）
- API は `/api/o/<団体の URL 名>/staff`・`/shifts`・`/shifts/draft`・`/shifts/:id` です
- `pnpm prisma:seed` は、団体「WordCamp 2024 運営」（`/o/demo`）とそのオーナー `leader@example.com`、もう 1 つの団体（`/o/other`、`leader@example.com` は所属しない）を作ります

### DB とマイグレーション

DB は Postgres（自前・Docker・Cloudflare Hyperdrive）と SQLite（Cloudflare D1）の両方に対応しています。

- モデルの定義は `prisma/schema/models.prisma` の 1 か所だけです。ここから `pnpm prisma:generate`（`pnpm install` でも走る）が、DB ごとのスキーマ（`prisma/generated-schema/`）と Prisma Client（`src/generated/`）を作ります。どちらも git には入れません
- 両方の DB で使える書き方だけにしてください（配列型 `String[]`・`Json[]`、`@db.*` の型指定、`Json` の `@default` は使えません）
- マイグレーションは DB ごとに `prisma/migrations/postgresql` と `prisma/migrations/sqlite` にあります。モデルを変えたら `pnpm prisma:migrate new <名前>` で両方を作り、`pnpm prisma:migrate check` で両方がモデルと合っているかを確かめます
- どちらの DB を使うかは `DATABASE_PROVIDER`（`postgresql` か `sqlite`、既定は `postgresql`）で選びます
- モデルを変えてクライアントを作り直したら、dev サーバーを再起動してください（動いている dev サーバーは古いクライアントを持ったままになります）
- `.env` はアプリ・Prisma CLI・seed のどれからも `src/lib/load-env.ts` で読み込み、すでに設定されている環境変数は上書きしません

## ディレクトリ

```
src/
  routes/          # 画面と API（ファイル名がそのまま URL になる）
    __root.tsx     # 全ページ共通の HTML
    _authed/       # ログインが必要な画面（/・/orgs/new・/join・/o/<団体>/...）
    login.tsx・signup.tsx・welcome.tsx
    api/           # /api/auth/*（ログイン）と /api/o/<団体>/*（団体の API）
  server/          # サーバーだけで動く処理（DB アクセス・server function）
  components/      # 画面の部品
  lib/             # Prisma Client・.env の読み込みなど
  generated/       # prisma generate の出力（git 管理外）
  types/           # 型
prisma/            # モデル定義（schema/）・DB ごとのマイグレーション（migrations/）・seed
scripts/           # スキーマの生成・マイグレーションの補助
misc/              # 要件定義などの資料
```

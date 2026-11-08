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

### 団体・テナント・イベント

複数の団体が同じインスタンスを使います。団体の中は **テナント（店舗にあたる単位）> イベント（単発運用）** の階層です。

- シフトは必ずどれかのテナントに属します。**イベントに紐づかないシフトは「日常シフト」** です
- シフトの **持ち場**（受付・レジなど）は、日常シフトの持ち場（テナントごと）とイベントの持ち場（イベントごと）を分けて持ちます。スタッフは団体全体で共通です。コードでは `Position` です（DB のテーブル名は以前の名前の `Role` のまま）
- 時間粒度はテナントごとに決め、イベントで上書きできます
- 団体を作るとテナントが 1 つ作られます。テナントが 1 つのうちは、テナントを選ぶ手順は出ません

| URL                                             | 画面                                     |
| ----------------------------------------------- | ---------------------------------------- |
| `/`                                             | 所属している団体の一覧                   |
| `/orgs/new`・`/join`                            | 団体を作る・招待コードで参加             |
| `/o/<団体>`                                     | テナントの一覧（1 つならそのテナントへ） |
| `/o/<団体>/t/<テナント>`・`/draft`              | 日常シフト（確定・下書き）               |
| `/o/<団体>/t/<テナント>/events`                 | イベントの一覧                           |
| `/o/<団体>/t/<テナント>/e/<イベント>`・`/draft` | イベントのシフト（確定・下書き）         |
| `/o/<団体>/settings`                            | この団体での表示名・メンバー・招待コード |

#### ロール（権限）と招待コード

- 権限は Discord のような **ロール** で決めます。ロールごとに権限の項目をオン・オフし、1 人が複数のロールを持てます（権限は足し合わせ）
- 団体を作ると、最初から **マネージャー・リーダー・スタッフ・ゲスト** のロールがあります（編集・追加・削除できます）。**オーナー** は別の扱いで、常に全権限を持ち、外せません

  | 権限の項目                                                       | マネージャー | リーダー | スタッフ | ゲスト |
  | ---------------------------------------------------------------- | ------------ | -------- | -------- | ------ |
  | シフトを見る・メンバーを見る                                     | ○            | ○        | ○        | ○      |
  | シフトを作る・変える・確定する                                   | ○            | ○        |          |        |
  | 持ち場・スタッフ・イベントを管理する                             | ○            | ○        |          |        |
  | 招待コードを発行・取り消す                                       | ○            | ○        |          |        |
  | テナントの管理・メンバーのロールの変更・ロールの編集・団体の設定 | ○            |          |          |        |
  | Discord サーバーの参加条件を免除する                             |              |          |          | ○      |

- テナントやイベントでロールを割り当てると（店長など）、その場面だけ **シフトに関わる権限**（シフトの閲覧・編集・確定、持ち場・イベントの管理）が上乗せされます。団体全体の権限（メンバーの管理など）は上乗せされません
- **自分が持っている権限の範囲でしか、ロールに付けたり人に渡したりできません**（権限の乗っ取り防止）。自分にない権限を含むロールは、作る・変える・消す・人に付ける・外す・招待コードで渡す、のどれもできません
  - 例外は 1 つだけ：「ゲストを招待する」を持つ人は、自分になくても「Discord サーバーの参加条件の免除」を含むロール（ゲストなど）の招待コードを発行できます。免除のほかに自分にない権限を含むロールや、招待以外（ロールの付け外し）には、この例外はありません
- ほかの人は **招待コード**（`/join`）で団体に参加します。コードは 8 文字（読み間違えやすい 0・O・1・I・L は使わない）で、発行するときに付けるロール・使える回数（既定は 1 回）・有効期限（既定は 7 日）を決めます
- 表示名は団体ごとに決められます

#### データの分離

- **所属していない団体のデータは見えません。** シフトを読み書きする処理は、必ず `requireScopeAccess`（`src/server/scope-access.server.ts`）で、団体のメンバーか・テナントやイベントがその団体の下にあるか・その単位での権限を確かめ、その単位の ID で絞り込みます
- 所属していない団体・その団体にないテナントやイベントは「見つかりません」（404）として扱い、あるかどうかも漏らしません
- これは `src/server/org-isolation.integration.test.ts` で、実際の DB を使って確かめています（`DATABASE_URL` がないと飛ばします）
- API は `/api/o/<団体>/staff`、`/api/o/<団体>/t/<テナント>/shifts`（日常シフト）、`/api/o/<団体>/t/<テナント>/e/<イベント>/shifts`（イベント）と、それぞれの `/draft`・`/:id` です
- `pnpm prisma:seed` は、団体「デモ団体」（`/o/demo`。テナントは渋谷店・新宿店、渋谷店にイベント「WordCamp 2024」）とそのオーナー `leader@example.com`、もう 1 つの団体（`/o/other`、テナント 1 つ、`leader@example.com` は所属しない）を作ります

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
    _authed/       # ログインが必要な画面（/・/orgs/new・/join・/o/<団体>/t/<テナント>/e/<イベント>/...）
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

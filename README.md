<div align="center">
<img src="https://raw.githubusercontent.com/shiftwo-app/shiftwo/main/.github/logo_standard.svg" alt="Shiftwo / シフトヲ" style="width: 400px; max-width: 100%;" />
</div>

技術カンファレンスの運営スタッフ向けのシフト管理アプリです。

## 技術スタック

- [TanStack Start](https://tanstack.com/start)（React 19・TanStack Router）
- [Vite+](https://viteplus.dev/)（`vp`。Vite・Oxlint・Oxfmt・Vitest をまとめたツールチェーン）
- [Prisma](https://www.prisma.io/) + PostgreSQL（Cloudflare では D1 か Hyperdrive 経由の Postgres）
- Node.js（[セルフホスト](#セルフホストdocker)）でも Cloudflare Workers（[Cloudflare で動かす](#cloudflare-で動かす)）でも動きます
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
| `pnpm dev:cloudflare`            | Workers のランタイム（workerd）で開発サーバーを起動する                        |
| `pnpm deploy:cloudflare`         | Cloudflare 向けに build して deploy する                                       |

書式と lint の設定は `vite.config.ts` の `fmt`・`lint` にあります。

### ログインと新規登録

ログインは [Better Auth](https://www.better-auth.com/) で、次の 2 つの方法があります。

- **メール**：確認コードと、押すだけでログインできるリンクを 1 通のメールで送ります（10 分で使えなくなります）。開発中（`MAIL_TRANSPORT` が未設定）はメールを送らず、dev サーバーのターミナルに出します。本番では `MAIL_TRANSPORT` を `smtp` か `cloudflare`（Cloudflare Email Service）にします
- **Discord**：`DISCORD_CLIENT_ID` と `DISCORD_CLIENT_SECRET` の両方を設定したときだけ、ログイン画面にボタンが出ます。[Discord Developer Portal](https://discord.com/developers/applications) でアプリを作り、OAuth2 の Redirects に `<BETTER_AUTH_URL>/api/auth/callback/discord` を登録してください。Discord でメールアドレスを確認していないアカウントではログインできません

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
| `/account`                                      | アカウント（Discord の連携）             |

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

#### Discord との連携

- **アカウントの連携**：メールで登録した人も、`/account`（ヘッダーの名前から開く）で Discord を連携できます。メールアドレスが違う Discord アカウントでも、ログインした本人の操作なら連携できます（自動の紐づけは、確認済みの同じアドレスのときだけ）
- **参加の条件にする Discord サーバー**：団体の設定で「団体の設定」の権限を持つ人が、自分の参加している Discord サーバーから選びます。選ぶと、そのサーバーのメンバーだけが招待コードで参加でき、シフトを見られます
  - 確かめるのは、**招待コードで参加するとき** と **ログインするたび**。サーバーを抜けた人は団体のデータを見られなくなり（`/suspended/<団体>` に案内）、メンバーの情報は消さずに残します。サーバーに戻って確かめ直すと、元どおり使えます
  - Discord に問い合わせられなかったとき（障害など）は、今の状態を変えません
  - オーナーと、「Discord サーバーの参加条件を免除する」を持つロール（既定ではゲスト）の人は免除されます
  - サーバーの指定を外すと、止めていたメンバーは全員元に戻ります
  - 使いかたの説明は `/help/discord-server`（ログインなしで見られます）
- **アイコン**：一覧やタイムラインに出すアイコンは、次の順で決めます（本人が選んだものを、Discord から自動でとったものより優先します）
  1. その団体でだけ使うアイコン（団体の「設定・メンバー」でアップロード）
  2. アカウントのアイコン（`/account` でアップロード。メールで登録した人も使えます）
  3. 団体の Discord サーバーでのアイコン
  4. Discord のアイコン
  5. どれもなければ名前の頭文字
- Discord に求める権限（scope）は `identify`・`email`・`guilds`（サーバーの一覧）・`guilds.members.read`（サーバーでのプロフィール）です

#### アイコンのアップロード

- ブラウザで真ん中を正方形に切り抜き、256px に縮めて描き直してから送ります（写真に埋め込まれた撮影場所などの情報は送りません）
- サーバーは、512KB までの PNG・JPEG・WebP だけを受け付けます。種類は中身の先頭のバイトで確かめ、SVG は受け付けません
- 画像は `/api/avatars/<uuid>.<拡張子>` で、ログインしている人にだけ返します。外のサイトの画像 URL は出しません（`user.image` は本人が書き換えられるので、Discord の CDN 以外は使いません）
- 保存先は `STORAGE_DRIVER` で選びます。Node では `local`（`STORAGE_DIR`、既定は `data/uploads`）、Cloudflare では `r2` です

#### スタッフの希望

メニューの「希望」（`/o/<団体>/preferences`）で、スタッフが休憩・参加できない時間、やりたい持ち場、メモ（200 文字まで）を出せます。

- 団体全体の希望を基本にして、テナントやイベントごとに上書きできます。あるイベントのシフトでは、イベント → テナント → 団体全体の順に、ある希望を使います（持ち場はテナント・イベントごとのものなので、持ち場の希望はその単位の希望だけ）
- 希望を出せるのは、自分に紐づくスタッフがいるメンバーです（スタッフの管理で、メンバーと紐づけます）
- 締切は団体・テナント・イベントのそれぞれに決められます（団体は `org.settings`、テナントは `tenant.manage`、イベントは `event.manage`）。過ぎると本人は変えられません
- イベントには期間（始まり・終わり）を決められ、期間の外の休憩は出せません。休憩どうしの重なりや、時間粒度にそろっていない時刻も断ります
- 全員の希望を見て、締切のあとでも直せるのは、団体全体の希望なら `staff.manage`、テナント・イベントの希望ならその単位の `shift.edit` を持つ人です
- シフトの画面では、希望と違う割り当て（希望の持ち場の外、休憩と重なる）をオレンジの枠で示し、理由をツールチップと読み上げで伝えます（FR-4-E）。希望の中身は個人のものなので、シフトを編集できる人にだけ出します

#### 同時編集

シフトの画面は、何人かで同時に開いて直せます。

- ほかの人がシフトを作る・変える・消すと、開いている画面にすぐ反映されます（画面の上に、受け取れているかが出ます）
- 2 人が同じシフトを同時に直したときは、後から保存したほうを止めて「ほかの人が先にこのシフトを変更しました」と知らせ、最新の内容を表示します（黙って上書きしません）。シフトの `version` が、読んだときと同じときだけ保存できます。API でも、PUT の body に `version` を入れると同じ確かめをします（入れなければ確かめません）
- 届け方は動かす場所で違います。Node は SSE（`/api/o/<団体>/t/<テナント>[/e/<イベント>]/live`）、Cloudflare は WebSocket（シフトの単位ごとの Durable Object `ShiftBoardRoom`。待っているあいだは休む Hibernation を使います）
- 知らせるのは「どのシフトが変わったか」だけで、受け取った画面が自分の権限で読み直します
- Node は 1 台で動かす前提です（つながっている人をプロセスのメモリで覚えるため）。複数台にするときは、Redis などで配る仕組みが要ります
- 持ち場・スタッフの変更は、まだ知らせません（シフトの画面を読み直すと反映されます）

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

## セルフホスト（Docker）

自分のサーバーで、Docker で動かせます（アプリ・Postgres・マイグレーション）。設定は `deploy/docker/` にあります。

```bash
cd deploy/docker
cp env.example .env      # POSTGRES_PASSWORD・BETTER_AUTH_SECRET・BETTER_AUTH_URL・メールの設定を書く
docker compose up -d --build
```

- `migrate` が `prisma migrate deploy` を流し終えてから `app` が起動します。更新するときも、`git pull` のあとに同じコマンドを流せば済みます
- データは volume に残ります（Postgres は `db`、アップロードしたアイコンは `uploads`）。バックアップするときは、この 2 つを取ります
- 公開するポートは `.env` の `PORT`（既定は 3000）です。HTTPS はリバースプロキシ（Caddy・nginx など）で付け、`BETTER_AUTH_URL` には外から見た URL を書きます
- このディレクトリの `.env` は、開発用のリポジトリ直下の `.env` とは別のものです

### メールの送り方

| `MAIL_TRANSPORT` | 送り先                               | 設定                                                      |
| ---------------- | ------------------------------------ | --------------------------------------------------------- |
| `smtp`           | ふつうのメールサーバー               | `SMTP_URL`（例：`smtp://user:pass@smtp.example.com:587`） |
| `cloudflare`     | Cloudflare Email Service（REST API） | `CLOUDFLARE_ACCOUNT_ID`・`CLOUDFLARE_EMAIL_API_TOKEN`     |

どちらも、送り主は `MAIL_FROM`（と `MAIL_FROM_NAME`）です。`cloudflare` のときは、Email Sending に登録したドメインのアドレスにし、API トークンには「Email Sending: Edit」の権限を付けます。Cloudflare の SMTP（`smtps://api_token:<トークン>@smtp.mx.cloudflare.net:465`）を `smtp` で使うこともできます。

## Cloudflare で動かす

Cloudflare Workers に deploy できます。自分の Cloudflare アカウントで動かすときも、同じ手順です。設定は `wrangler.jsonc` にあります。

| 役割             | 使うもの                                                                                 | 設定                                     |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| DB               | D1（既定）か、Hyperdrive 経由の Postgres                                                 | `DATABASE_PROVIDER`                      |
| アイコンの保存先 | R2                                                                                       | `STORAGE_DRIVER=r2`                      |
| ログインのメール | [Email Service](https://developers.cloudflare.com/email-service/)（Workers Paid が要る） | `MAIL_TRANSPORT=cloudflare`・`MAIL_FROM` |

### はじめての deploy（D1 のとき）

1. `wrangler.jsonc` の `name` と `vars`（`BETTER_AUTH_URL`・`MAIL_FROM` など）を自分のものに直す
2. `pnpm wrangler login`
3. 秘密の値を入れる：`pnpm wrangler secret put BETTER_AUTH_SECRET`（Discord を使うなら `DISCORD_CLIENT_ID`・`DISCORD_CLIENT_SECRET` も）
4. `pnpm deploy:cloudflare`。D1 と R2 は ID を書いていなければ、このときに wrangler が作ります
5. `pnpm d1:migrate:remote` で、D1 にマイグレーションを当てる（モデルを変えたあとも、deploy の前に毎回）
6. Email Service で送り主のドメインを登録する（`MAIL_FROM` はそのドメインのアドレス）

### Postgres（Hyperdrive）を使うとき

1. `pnpm wrangler hyperdrive create shiftwo --connection-string="postgres://..."` で作る
2. `wrangler.jsonc` の `hyperdrive` を有効にして ID を書き、`vars` の `DATABASE_PROVIDER` を `postgresql` にする
3. `CLOUDFLARE_DATABASE=postgresql pnpm deploy:cloudflare` で deploy する（build に入れる DB を選ぶため。`DATABASE_PROVIDER` と食い違うと起動時に止まります）
4. マイグレーションは Node から `DATABASE_URL` に直接つないで、`pnpm exec prisma migrate deploy` で当てる

### ローカルで Workers のランタイムを試す

```bash
pnpm d1:migrate:local       # ローカルの D1（.wrangler/ の中）にマイグレーションを当てる
pnpm dev:cloudflare         # http://localhost:3000
```

- ローカルの秘密の値と `BETTER_AUTH_URL` は `.dev.vars` に書きます（`.dev.vars` があると `.env` は読まれません）
- D1・R2 はローカルに作られ、メールは送らずにターミナルへ出ます
- Hyperdrive を試すときは、`hyperdrive` に `"localConnectionString": "postgres://..."` を足し、`CLOUDFLARE_DATABASE=postgresql pnpm dev:cloudflare` で起動します

### しくみ

- `CLOUDFLARE=1` のときだけ `vite.config.ts` が `@cloudflare/vite-plugin` を足し、`#platform`（`src/platform/`）を Workers 用に差し替えます。Node 用の build とテストは今までどおりです
- Workers では、Prisma Client を Workers 用（`runtime = "workerd"`）に別に作ったものを使います（`src/generated/prisma-*-workerd`）。クエリエンジンの wasm は DB ごとに約 1MB あるので、使う DB の分だけを build に入れます
- Hyperdrive の接続はリクエストをまたいで使えないので、リクエストごとに作ります（`src/server.ts` と `src/lib/request-scope.server.ts`）。呼び出す側は `prisma` をそのまま使えます
- **D1 にはトランザクションがありません。** `prisma.$transaction` の中の処理も 1 つずつ実行され、途中で失敗すると前の分は戻りません（ロールの付け替えや招待での参加など）。確実さが要るなら Postgres（Hyperdrive）を使ってください

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
  platform/        # 動かす場所（Node・Cloudflare Workers）で変わる部分（DB の接続・メール・保存先）
  server.ts        # サーバーの入口（リクエストごとの入れ物を作る）
  generated/       # prisma generate の出力（git 管理外）
  types/           # 型
prisma/            # モデル定義（schema/）・DB ごとのマイグレーション（migrations/）・seed
scripts/           # スキーマの生成・マイグレーションの補助
misc/              # 要件定義などの資料
```

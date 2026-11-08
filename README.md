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

ログインは [Better Auth](https://www.better-auth.com/) で、次の 3 つの方法があります。

- **メール**：確認コードと、押すだけでログインできるリンクを 1 通のメールで送ります（10 分で使えなくなります）。開発中（`MAIL_TRANSPORT` が未設定）はメールを送らず、dev サーバーのターミナルに出します。本番では `MAIL_TRANSPORT` を `smtp` か `cloudflare`（Cloudflare Email Service）にします
- **Discord**：`DISCORD_CLIENT_ID` と `DISCORD_CLIENT_SECRET` の両方を設定したときだけ、ログイン画面にボタンが出ます。[Discord Developer Portal](https://discord.com/developers/applications) でアプリを作り、OAuth2 の Redirects に `<BETTER_AUTH_URL>/api/auth/callback/discord` を登録してください。Discord でメールアドレスを確認していないアカウントではログインできません
- **パスキー**：指紋・顔・端末のロックの解除でログインします。登録は、メールか Discord でログインしてから、アカウントの設定で行います（パスキーだけで新しく登録することはできません）。パスキーは `BETTER_AUTH_URL` のホスト名（rpID）に結びつくので、本番のドメインを変えると、登録したパスキーは使えなくなります

はじめての人は、メールか Discord でアカウントが作られ、`/welcome` で名前を決めてから使い始めます（新規登録は `/signup`）。

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

#### 時間帯ごとの必要人員

持ち場の「必要な人数」は基本の人数で、持ち場の設定の「時間帯ごとの人数」で、決めた時間帯だけ人数を変えられます（例：お昼の 12:00〜13:00 だけ 3 人）。

- 時刻は日本時間で、日付を空けると毎日、入れるとその日だけに当てはめます。同じ時間に両方あれば、日付のあるほうを使います（その日だけの例外として）
- 同じ日どうし（または毎日どうし）の時間帯は重ねられません。終わりの 00:00 は、その日の 24:00 の意味です
- シフトの画面の不足の帯（FR-4-D）と、レポートの充足率（FR-7-C）は、時間帯ごとの人数で数えます。基本の人数が 0 でも、決まりの時間帯があればレポートに入れます
- 計算は `src/lib/staffing.ts`。決まりは持ち場の `staffingRules`（Json）に持ち、持ち場と一緒に保存します（権限も持ち場と同じ `position.manage`）

#### 持ち場を使うか

持ち場（受付・レジなど）を使わない運用もできます。使わないときは、シフトを人と時間だけで組みます（持ち場の選択・持ち場別の表示・必要な人数・希望の持ち場を出しません）。

- 団体の設定（`org.settings`）を基本にして、テナントの設定（`tenant.manage`）とイベントの設定（`event.manage`）で上書きできます（イベント → テナント → 団体の順に決まります）
- 使わない単位で作ったシフトには持ち場がありません。あとで使うようにすると、持ち場別の表示では「持ち場なし」の行にまとまります
- 使わない単位では、API で持ち場を送っても捨てます。使う単位では、持ち場が必須です

#### スタッフの希望

メニューの「希望」（`/o/<団体>/preferences`）で、スタッフが休憩・参加できない時間、やりたい持ち場、メモ（200 文字まで）を出せます。

- 団体全体の希望を基本にして、テナントやイベントごとに上書きできます。あるイベントのシフトでは、イベント → テナント → 団体全体の順に、ある希望を使います（持ち場はテナント・イベントごとのものなので、持ち場の希望はその単位の希望だけ）
- 希望を出せるのは、自分に紐づくスタッフがいるメンバーです（スタッフの管理で、メンバーと紐づけます）
- 締切は団体・テナント・イベントのそれぞれに決められます（団体は `org.settings`、テナントは `tenant.manage`、イベントは `event.manage`）。過ぎると本人は変えられません
- イベントには期間（始まり・終わり）を決められ、期間の外の休憩は出せません。休憩どうしの重なりや、時間粒度にそろっていない時刻も断ります
- 全員の希望を見て、締切のあとでも直せるのは、団体全体の希望なら `staff.manage`、テナント・イベントの希望ならその単位の `shift.edit` を持つ人です
- 全員の希望を扱える人は、CSV で一括登録できます（FR-5-J）。列は「スタッフ・休憩・持ち場・メモ」（英語の staff / breaks / positions / memo でも可）で、休憩は `2026-11-20 12:00-13:00` を `;` で区切って並べ、持ち場は名前を `;` で区切ります。先に「確かめる」で行ごとの問題を一覧にし、問題がなければ登録します（どれかの行に問題があれば何も登録しません）。ひな形は画面からダウンロードできます
- シフトの画面では、希望と違う割り当て（希望の持ち場の外、休憩と重なる）をオレンジの枠で示し、理由をツールチップと読み上げで伝えます（FR-4-E）。希望の中身は個人のものなので、シフトを編集できる人にだけ出します

#### タイムテーブル

イベントの「タイムテーブル」タブで、セッション（講演など）を取り込んで見られます（FR-6）。

- 取り込み（FR-6-A）：タイトル・登壇者・部屋・開始・終了の列を持つ CSV か、同じ項目の JSON（配列か `{ "sessions": [...] }`）。トラック色（`#RRGGBB`）とタグ（`;` 区切り）は任意です。時刻は「2026-11-20 10:00」（日本時間）か ISO 8601 で、日付の列があれば開始・終了は「10:00」だけでも読みます。「確かめる」で行ごとの問題を出し、問題がなければ「取り込む」で、このイベントのタイムテーブルをまるごと置き換えます（サーバーでも確かめ直し、1 行でも問題があれば何も変えません）。イベントの期間を決めていれば、その外のセッションは断ります
- 見る（FR-6-B）：部屋ごとに列を並べた表（部屋ごとに色のラベル）と一覧。一覧からは 1 件ずつ直す・消すこともできます
- シフトの画面（FR-6-C）：部屋ごとの行として、シフトの上に透ける色で重ねます（「タイムテーブルを重ねる」で切り替え）。現在時刻の線と見比べて、進み具合を確かめられます（FR-6-F）
- 希望の画面（FR-6-F）：イベントの希望を出すとき、参考としてセッションの一覧を開けます
- 見られるのはシフトを見られる人、取り込み・直す・消すはイベントを管理できる人（`event.manage`）だけです（FR-6-D）。MCP の `get_timetable` でも読めます

#### シフトの確認とレポート

テナント・イベントの「レポート」タブで、日ごとのレポートを見られます（確定シフト。下書きにも切り替えられます）。

- 持ち場ごとの充足率（FR-7-C）：その日の時間帯で「入っている人数（必要な人数まで）× 時間」÷「必要な人数 × 時間」を、％とバーで示します。90% 未満は橙、70% 未満は赤です。同じ人の重なった割り当ては 1 人と数え、休憩の持ち場と必要な人数が 0 の持ち場は除きます
- 休憩（FR-7-B）：「休憩として数える」持ち場のシフトと、シフトのあいだの空き（既定 15 分以上。テナントごとに変えられます）を合計します
- スタッフごと（FR-7-D）：名前で絞り込めます。働く時間・休憩・希望と違う割り当ての数と、その日のシフトの一覧を出します
- CSV で書き出す（FR-7-E）：持ち場別（行＝持ち場、列＝時間の枠、中身＝入っている人）と、スタッフ別（行＝スタッフ、列＝合計とシフトの一覧）。書き出せるのはシフトを編集できる人で、スタッフは自分の分だけ書き出せます

#### 同時編集

シフトの画面は、何人かで同時に開いて直せます。

- ほかの人がシフトを作る・変える・消すと、開いている画面にすぐ反映されます（画面の上に、受け取れているかが出ます）
- 2 人が同じシフトを同時に直したときは、後から保存したほうを止めて「ほかの人が先にこのシフトを変更しました」と知らせ、最新の内容を表示します（黙って上書きしません）。シフトの `version` が、読んだときと同じときだけ保存できます。API でも、PUT の body に `version` を入れると同じ確かめをします（入れなければ確かめません）
- 届け方は動かす場所で違います。Node は SSE（`/api/o/<団体>/t/<テナント>[/e/<イベント>]/live`）、Cloudflare は WebSocket（シフトの単位ごとの Durable Object `ShiftBoardRoom`。待っているあいだは休む Hibernation を使います）
- 知らせるのは「どのシフトが変わったか」だけで、受け取った画面が自分の権限で読み直します
- Node は 1 台で動かす前提です（つながっている人をプロセスのメモリで覚えるため）。複数台にするときは、Redis などで配る仕組みが要ります
- シフト以外の変更も知らせます：持ち場（その単位）、スタッフ（団体のすべての単位）、タイムテーブル（そのイベント）、時間粒度や持ち場を使うかの設定（その単位と、テナントならそのイベントも）、希望（希望と違う割り当ての印が変わるので、その希望が当てはまる単位）。知らせる先はリクエストの中で調べ、送るのは応答のあとです（`src/server/board-live.server.ts`）

#### AI のアシスタントから使う（MCP）

Claude などの AI のアシスタントから、MCP（Model Context Protocol）でシフトヲを使えます。つなぎ先は `<BETTER_AUTH_URL>/api/mcp` です（アカウントの設定にも出ます）。

- **つなぎ方は OAuth です。** シフトヲが認可サーバーになり（Better Auth の `jwt` と `@better-auth/mcp`）、アシスタントは自分を登録してから（動的なクライアント登録。Node では URL で名乗る Client ID Metadata Document も使えます）、利用者のブラウザでログインと同意を求めます。発見のための案内は `/.well-known/oauth-protected-resource/api/mcp` と `/.well-known/oauth-authorization-server/api/auth` です
- **できることは、その人がシフトヲでできることだけです。** どの道具も、トークンの持ち主として、画面と同じ確かめ方（`requireScopeAccess`・`saveShift`・`requirePreferenceContext` など）で動きます。所属していない団体は見えず、シフトを見るだけの人は作れず、希望は自分の分だけです
- **さらに、つなぐときに範囲を絞れます。** 同意の画面で「変更も許す」を外すと、見るだけ（`shiftwo:read`）になり、書く道具は使えません（`shiftwo:write` が要ります）
- 道具：`list_organizations`・`list_scopes`・`get_shift_board`・`get_my_preference`・`get_timetable`（読む）、`create_shift`・`update_shift`・`delete_shift`・`submit_my_preference`（書く）。シフトの更新・削除は、同時編集と同じく `version` を確かめます。時刻は日本時間（+09:00）で返します
- アカウントの設定の「つないだアプリ」で、つながりを切れます。同意とトークンを消し、`/api/mcp` は同意が残っているかを毎回確かめるので、すぐに使えなくなります
- アクセストークン（JWT）は、同じプロセスの中の鍵で確かめます（Workers は自分のドメインへの fetch ができないため、鍵を HTTP で取りに行きません）。送り手に縛ったトークン（DPoP）は受け付けません

#### スマートフォン（FR-3）

- 狭い画面では、見出しの言語・アカウント・ログアウトをメニュー（右から出るドロワー）にまとめます。タブは横にスクロールできます
- シフトの表は、2 本の指のピンチでズームできます。ピンチを使えない人のために、目盛りの横に − / + のボタンもあります
- ホーム画面に追加できます（Web App Manifest と Service Worker。`public/manifest.webmanifest`・`public/sw.js`）。オフラインでの利用には対応せず、つながらないときは案内だけを出します。Service Worker は本番の build でだけ登録します

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
- アプリのイメージ（`runtime`）は、サーバーの依存を build のときに `dist/server` へまとめ（`BUNDLE_SERVER=1`）、`node_modules` を持たない `node:26-alpine` で動かします（約 270MB。以前は約 800MB）。マイグレーションは依存の入った `build` の段階のイメージで流します

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

## 多言語対応

画面は日本語・英語・中国語（簡体字・繁体字）・韓国語で使えます。上の帯（ログイン前の画面は下）の言語の切り替えで選べます。

- 言語は、選んだ言語（Cookie `shiftwo-locale`）、なければブラウザの言語（Accept-Language）、どちらもなければ日本語で決まります。ログインしている人が選んだ言語は、アカウントにも保存します（アカウントの「言語」で「ブラウザに合わせる」にも戻せます）。ほかのブラウザでログインしても、アカウントの言語にそろえます中国語は、台湾・香港・マカオと `Hant` の指定なら繁体字、それ以外は簡体字です
- メッセージは `src/lib/i18n/messages/<名前空間>/<言語>.ts` にあります。日本語（`ja.ts`）が基準で、ほかの言語は同じキーをすべて持つ必要があります（足りないと型エラー、差し込み `{name}` の食い違いはテストで見つかります）
- 画面では `useT()`（`src/lib/i18n/react.tsx`）、サーバー（エラー・ログインのメール）では `serverT`（`src/lib/i18n/request-locale.server.ts`）でメッセージを引きます。日付の書き方は言語に合わせ、時刻は日本時間のまま出します
- 中国語・韓国語では、その言語の字形の書体を使います（BIZ UDP ゴシックは日本語の書体のため）
- 言語を足すときは、`src/lib/i18n/locales.ts` の `LOCALES` と、各名前空間にその言語のファイルを足します
- メールは受け取る人の言語で送ります。アカウントで選んだ言語があればその言語、なければ、そのとき使っている言語です（ログインのメールは、受け取る人の言語を調べるのも応答のあとに行い、届く宛先かどうかが応答時間でわからないようにしています）。これから足すメールは `src/server/user-locale.server.ts` の `localeForUser` / `localeForEmail` で言語を決めます
- 団体名・持ち場名・ロール名など、使う人が入れたデータは訳しません（団体を作ったときの既定のロール名も日本語です）。運営者向けのエラー（設定の誤りなど）とログも日本語のままです

## デザイン

会場の案内サイン（駅の発車標やスタッフの名札）をもとにしています。

- 色・文字は `src/styles.css` のトークン（`paper`・`surface`・`ink`・`primary`・`brand` など）で決め、Tailwind のクラス（`bg-surface`・`text-ink-muted` など）として使います。ダークモードはトークンの値だけを差し替えるので、`gray-*` や色の値を直接書かないでください
- ボタン・入力欄・区切り・お知らせなどの部品は `src/components/ui/` にあります。入力欄には `.control` のクラスを付けます
- `brand`（ロゴの赤）は、ロゴと、タイムラインの「いま」の線・同時編集がつながっている印にだけ使います。操作の色は `primary`（青緑）です
- 文字は BIZ UDP ゴシック（Google Fonts）です。ロゴは `src/components/Logo.tsx` です

## ディレクトリ

```
src/
  routes/          # 画面と API（ファイル名がそのまま URL になる）
    __root.tsx     # 全ページ共通の HTML
    _authed/       # ログインが必要な画面（/・/orgs/new・/join・/o/<団体>/t/<テナント>/e/<イベント>/...）
    login.tsx・signup.tsx・welcome.tsx
    api/           # /api/auth/*（ログイン）と /api/o/<団体>/*（団体の API）
  server/          # サーバーだけで動く処理（DB アクセス・server function）
  components/      # 画面の部品（ui/ は共通の部品、shell/ は画面の枠）
  lib/             # Prisma Client・.env の読み込みなど
  platform/        # 動かす場所（Node・Cloudflare Workers）で変わる部分（DB の接続・メール・保存先）
  server.ts        # サーバーの入口（リクエストごとの入れ物を作る）
  generated/       # prisma generate の出力（git 管理外）
  types/           # 型
prisma/            # モデル定義（schema/）・DB ごとのマイグレーション（migrations/）・seed
scripts/           # スキーマの生成・マイグレーションの補助
misc/              # 要件定義などの資料
```

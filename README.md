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

### 2. DB と依存の準備

devcontainer を使う場合は、VS Code で「Reopen in Container」を選ぶと DB も一緒に起動し、`pnpm install` まで実行されます。

手元で動かす場合:

```bash
cd .devcontainer && docker compose up -d db && cd ..
pnpm install
pnpm exec prisma migrate dev
pnpm prisma:seed
```

### 3. 開発サーバー

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開くと確定シフト、[/draft](http://localhost:3000/draft) を開くと下書きのシフトが表示されます。

## よく使うコマンド

| コマンド           | 内容                                                         |
| ------------------ | ------------------------------------------------------------ |
| `pnpm dev`         | 開発サーバーを起動する（`vp dev`）                           |
| `pnpm build`       | 本番用に build する（`vp build`。出力は `dist/`）            |
| `pnpm start`       | build したものを Node.js で動かす（srvx）                    |
| `pnpm check`       | 書式・lint・型チェックをまとめて行う（`vp check`）           |
| `pnpm check:fix`   | 書式を直し、lint の自動修正をかける                          |
| `pnpm prisma:seed` | 初期データを入れる（Node 26 で `prisma/seed.ts` を直接実行） |

書式と lint の設定は `vite.config.ts` の `fmt`・`lint` にあります。

## ディレクトリ

```
src/
  routes/          # 画面と API（ファイル名がそのまま URL になる）
    __root.tsx     # 全ページ共通の HTML
    index.tsx      # /（確定シフト）
    draft.tsx      # /draft（下書きシフト）
    api/           # /api/staff・/api/shifts など外から呼べる API
  server/          # サーバーだけで動く処理（DB アクセス・server function）
  components/      # 画面の部品
  lib/             # Prisma Client など
  types/           # 型
prisma/            # スキーマ・マイグレーション・seed
misc/              # 要件定義などの資料
```

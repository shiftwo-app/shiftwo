// 動かす場所（Node か Cloudflare Workers か）で変わる部分。
// アプリは "#platform" から platform を読む。ふだん（Node・テスト）は ./node.server.ts、
// Cloudflare 向けの build（CLOUDFLARE=1）では vite.config.ts の alias で ./cloudflare.server.ts に差し替わる
import type { Database } from "../lib/database";
import type { MailTransport } from "../lib/mail/mailer.server";
import type { BlobStore } from "../lib/storage/blob-store";

export type Platform = {
	name: "node" | "cloudflare";
	/**
	 * DB の接続をいつ作るか。process はプロセス（Worker）で一つを使い回す。
	 * request はリクエストごとに作る（Workers の Hyperdrive。接続を別のリクエストで使えないため）
	 */
	databaseScope: "process" | "request";
	createDatabase(): Database;
	/** この場所でだけ使えるメールの送り方（MAIL_TRANSPORT の値ごと）。console はどこでも使える */
	mailTransports: Partial<Record<string, MailTransport>>;
	/** アップロードしたファイルの保存先（STORAGE_DRIVER を読む） */
	createBlobStore(): BlobStore;
	/**
	 * 応答を返したあとも続けてよい処理（メールを送るなど）。待たずに戻る。
	 * Workers では waitUntil に載せないと、応答を返した時点で止められてしまう。失敗はログに出す
	 */
	runInBackground(label: string, task: () => Promise<unknown>): void;
};

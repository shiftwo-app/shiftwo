// Cloudflare Workers で動かすときの platform。see ./types.ts
// CLOUDFLARE=1 の build でだけ使う（vite.config.ts の alias で "#platform" をこのファイルに向ける）。
// binding と環境変数は cloudflare:workers の env から読む（wrangler.jsonc の vars・secrets と binding）
import { env, waitUntil } from "cloudflare:workers";
import { cloudflareDatabase } from "#cloudflare-database";
import { parseDatabaseProvider } from "../lib/database-provider";
import type { MailTransport } from "../lib/mail/mailer.server";
import { createR2BlobStore } from "../lib/storage/r2-store.server";
import type { Platform } from "./types";

// build に入れた DB（CLOUDFLARE_DATABASE）と、wrangler.jsonc の DATABASE_PROVIDER が食い違っていたら止める
const provider = parseDatabaseProvider(env.DATABASE_PROVIDER);
if (provider !== cloudflareDatabase.provider) {
	throw new Error(
		`DATABASE_PROVIDER=${provider} ですが、${cloudflareDatabase.provider} 用に build されています（CLOUDFLARE_DATABASE=${provider} で build し直してください）`,
	);
}

const missingBinding = (name: string, setting: string) =>
	new Error(
		`wrangler.jsonc に ${name} の binding がありません（${setting} のときに要ります）`,
	);

/** Cloudflare Email Service で送る（MAIL_TRANSPORT=cloudflare） */
const cloudflareEmail: MailTransport = {
	async send(mail) {
		if (!env.EMAIL) throw missingBinding("EMAIL", "MAIL_TRANSPORT=cloudflare");
		if (!env.MAIL_FROM) {
			throw new Error(
				"MAIL_FROM が設定されていません（送り主のアドレス。Email Service に登録したドメインのもの）",
			);
		}
		await env.EMAIL.send({
			from: env.MAIL_FROM_NAME
				? { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM }
				: env.MAIL_FROM,
			to: mail.to,
			subject: mail.subject,
			text: mail.text,
			html: mail.html,
		});
	},
};

export const platform: Platform = {
	name: "cloudflare",
	databaseScope: cloudflareDatabase.scope,
	createDatabase: () => cloudflareDatabase.create(),
	mailTransports: { cloudflare: cloudflareEmail },
	createBlobStore() {
		const driver = env.STORAGE_DRIVER || "r2";
		if (driver !== "r2") {
			throw new Error(
				`STORAGE_DRIVER must be "r2" on Cloudflare (got "${driver}")`,
			);
		}
		if (!env.BUCKET) throw missingBinding("BUCKET", "STORAGE_DRIVER=r2");
		return createR2BlobStore(env.BUCKET);
	},
	runInBackground(label, task) {
		// task がその場で投げたエラーも、ここで受け止める
		waitUntil(
			Promise.resolve()
				.then(task)
				.catch((error: unknown) => console.error(label, error)),
		);
	},
};

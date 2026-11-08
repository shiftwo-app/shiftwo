// Node（開発・テスト・セルフホスト）で動かすときの platform。see ./types.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma-postgresql/client";
import { parseDatabaseProvider } from "../lib/database-provider";
import { loadEnvFileIfExists } from "../lib/load-env";
import { createCloudflareRestTransport } from "../lib/mail/cloudflare-rest-transport.server";
import { createSmtpTransport } from "../lib/mail/smtp-transport.server";
import { createSseHub } from "../lib/realtime/sse-hub.server";
import { createLocalBlobStore } from "../lib/storage/local-store.server";
import type { Platform } from "./types";

loadEnvFileIfExists();

// 開発中は HMR でモジュールが読み直されても、つながっている人を見失わないように globalThis に置く
const globalForRealtime = globalThis as unknown as {
	shiftwoSseHub?: ReturnType<typeof createSseHub>;
};
globalForRealtime.shiftwoSseHub ??= createSseHub();

export const platform: Platform = {
	name: "node",
	databaseScope: "process",
	createDatabase() {
		const provider = parseDatabaseProvider(process.env.DATABASE_PROVIDER);
		if (provider === "sqlite") {
			// D1 の接続は Workers の binding からしか作れない
			throw new Error(
				"DATABASE_PROVIDER=sqlite は Cloudflare D1 でだけ使えます（Node では postgresql を使ってください）",
			);
		}
		return new PrismaClient({
			adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
		});
	},
	mailTransports: {
		smtp: createSmtpTransport(process.env),
		// Workers の外から Cloudflare Email Service で送る（REST API）
		cloudflare: createCloudflareRestTransport(process.env),
	},
	createBlobStore() {
		const driver = process.env.STORAGE_DRIVER || "local";
		if (driver !== "local") {
			throw new Error(
				`STORAGE_DRIVER must be "local" on Node (got "${driver}")`,
			);
		}
		return createLocalBlobStore(process.env.STORAGE_DIR || "data/uploads");
	},
	realtime: globalForRealtime.shiftwoSseHub,
	runInBackground(label, task) {
		// task がその場で投げたエラーも、ここで受け止める
		void Promise.resolve()
			.then(task)
			.catch((error: unknown) => console.error(label, error));
	},
};

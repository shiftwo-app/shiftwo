// Workers で Hyperdrive 経由の Postgres（DATABASE_PROVIDER=postgresql）につなぐ。
// CLOUDFLARE_DATABASE が postgresql の build でだけ入る（vite.config.ts の alias で "#cloudflare-database" を向ける）
import { env } from "cloudflare:workers";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma-postgresql-workerd/client";
import type { Database } from "../lib/database";
import type { CloudflareDatabase } from "./cloudflare-database";

export const cloudflareDatabase: CloudflareDatabase = {
	provider: "postgresql",
	// Hyperdrive の接続は、リクエストをまたいで使えない。リクエストごとに作る
	// （閉じるのはリクエストが終わったときに Workers が行う。つなぎ直しの重さは Hyperdrive の接続プールが吸収する）
	scope: "request",
	create() {
		if (!env.HYPERDRIVE) {
			throw new Error(
				"wrangler.jsonc に HYPERDRIVE の binding がありません（DATABASE_PROVIDER=postgresql のときに要ります）",
			);
		}
		return new PrismaClient({
			adapter: new PrismaPg({
				connectionString: env.HYPERDRIVE.connectionString,
			}),
		}) as unknown as Database;
	},
};

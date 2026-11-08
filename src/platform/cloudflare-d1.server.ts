// Workers で D1（DATABASE_PROVIDER=sqlite）につなぐ。CLOUDFLARE_DATABASE が sqlite の build でだけ入る
// （vite.config.ts の alias で "#cloudflare-database" をこのファイルに向ける）
import { env } from "cloudflare:workers";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../generated/prisma-sqlite-workerd/client";
import type { Database } from "../lib/database";
import type { CloudflareDatabase } from "./cloudflare-database";

export const cloudflareDatabase: CloudflareDatabase = {
	provider: "sqlite",
	// D1 の binding は、リクエストをまたいで使い回せる
	scope: "process",
	create() {
		if (!env.DB) {
			throw new Error(
				"wrangler.jsonc に DB（D1）の binding がありません（DATABASE_PROVIDER=sqlite のときに要ります）",
			);
		}
		return new PrismaClient({
			adapter: new PrismaD1(
				env.DB as ConstructorParameters<typeof PrismaD1>[0],
			),
		}) as unknown as Database;
	},
};

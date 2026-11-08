// Workers での DB のつなぎ方。Prisma のクエリエンジン（wasm、約 1MB）は DB ごとに別なので、
// 使う DB の分だけを build に入れる（CLOUDFLARE_DATABASE。vite.config.ts を参照）
import type { Database } from "../lib/database";
import type { DatabaseProvider } from "../lib/database-provider";

export type CloudflareDatabase = {
	provider: DatabaseProvider;
	scope: "process" | "request";
	create(): Database;
};

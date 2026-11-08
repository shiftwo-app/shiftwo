import { defineConfig } from "prisma/config";
import { parseDatabaseProvider } from "./src/lib/database-provider.ts";
import { loadEnvFileIfExists } from "./src/lib/load-env.ts";

loadEnvFileIfExists();

// DATABASE_PROVIDER で、どの DB のスキーマとマイグレーションを使うかを選ぶ（既定は postgresql）。
// prisma generate は両方のクライアントを作りたいので、pnpm prisma:generate を使う
const provider = parseDatabaseProvider(process.env.DATABASE_PROVIDER);

export default defineConfig({
	schema: `prisma/generated-schema/${provider}/schema.prisma`,
	migrations: {
		path: `prisma/migrations/${provider}`,
		seed: "node prisma/seed.ts",
	},
	datasource: {
		// env("DATABASE_URL") だと未設定のとき prisma generate まで失敗するので、process.env から読む
		// （DB に繋がない generate は URL がなくても通し、migrate などは Prisma がエラーにする）
		// sqlite のときは file:./prisma/dev.db のような値（ローカルでマイグレーションを作るため）
		url: process.env.DATABASE_URL,
		// Postgres でマイグレーションとスキーマを比べるとき（pnpm prisma:migrate check）に使う、捨ててよい DB
		// SQLite は一時ファイルで比べるので要らない（渡すと Postgres の URL を SQLite として開こうとする）
		shadowDatabaseUrl:
			provider === "postgresql" ? process.env.SHADOW_DATABASE_URL : undefined,
	},
});

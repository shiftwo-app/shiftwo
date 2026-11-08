import { defineConfig } from "prisma/config";
import { loadEnvFileIfExists } from "./src/lib/load-env.ts";

loadEnvFileIfExists();

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "node prisma/seed.ts",
	},
	datasource: {
		// env("DATABASE_URL") だと未設定のとき prisma generate まで失敗するので、process.env から読む
		// （DB に繋がない generate は URL がなくても通し、migrate などは Prisma がエラーにする）
		url: process.env.DATABASE_URL,
	},
});
